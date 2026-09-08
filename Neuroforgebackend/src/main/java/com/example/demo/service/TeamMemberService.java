package com.example.demo.service;

import com.example.demo.model.Team;
import com.example.demo.model.TeamMember;
import com.example.demo.model.TeamRole;
import com.example.demo.model.User;
import com.example.demo.repository.TeamMemberRepository;
import com.example.demo.repository.TeamRepository;
import com.example.demo.repository.TeamRoleRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamRoleRepository teamRoleRepository;
    private final com.example.demo.security.ProjectScopeResolver projectScopeResolver;

    public TeamMemberService(TeamMemberRepository teamMemberRepository,
                             UserRepository userRepository,
                             TeamRepository teamRepository,
                             TeamRoleRepository teamRoleRepository,
                             com.example.demo.security.ProjectScopeResolver projectScopeResolver) {
        this.teamMemberRepository = teamMemberRepository;
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.teamRoleRepository = teamRoleRepository;
        this.projectScopeResolver = projectScopeResolver;
    }

    private void validateMemberAssignment(Long userId, Long teamId, Long excludeMemberId) {
        if (userId == null || teamId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID and Team ID are required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found with ID: " + userId));

        if (user.getStatus() == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            String currentStatus = user.getStatus() != null ? user.getStatus() : "UNKNOWN";
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot add user to team with account status: " + currentStatus + ". Account must be ACTIVE.");
        }

        Team targetTeam = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target team not found with ID: " + teamId));

        if (targetTeam.getProjectId() != null && !projectScopeResolver.isProjectAllowed(targetTeam.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify team members for this project");
        }

        if (excludeMemberId == null) {
            if (teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, user.getFullName() + " is already a member of this team.");
            }
        } else {
            if (teamMemberRepository.existsByTeamIdAndUserIdAndMemberIdNot(teamId, userId, excludeMemberId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, user.getFullName() + " is already a member of this team.");
            }
        }
    }

    private void resolveAndAssignRoles(TeamMember targetMember, TeamMember sourcePayload) {
        Set<TeamRole> resolvedRoles = new HashSet<>();

        // 1. Check if roleIds are explicitly provided
        if (sourcePayload.getRoleIds() != null && !sourcePayload.getRoleIds().isEmpty()) {
            for (Long rId : sourcePayload.getRoleIds()) {
                teamRoleRepository.findById(rId).ifPresent(resolvedRoles::add);
            }
        } 
        // 2. Check if roles entities are provided
        else if (sourcePayload.getRoles() != null && !sourcePayload.getRoles().isEmpty()) {
            resolvedRoles.addAll(sourcePayload.getRoles());
        } 
        // 3. Fallback to parsing roleInTeam string
        else if (sourcePayload.getRoleInTeam() != null && !sourcePayload.getRoleInTeam().isBlank()) {
            String[] parts = sourcePayload.getRoleInTeam().split(",");
            for (String part : parts) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    Optional<TeamRole> roleOpt = teamRoleRepository.findByRoleNameIgnoreCaseAndTeamId(trimmed, sourcePayload.getTeamId());
                    if (roleOpt.isEmpty()) {
                        roleOpt = teamRoleRepository.findByRoleNameIgnoreCaseAndTeamIdIsNull(trimmed);
                    }
                    if (roleOpt.isPresent()) {
                        resolvedRoles.add(roleOpt.get());
                    } else {
                        TeamRole newRole = new TeamRole();
                        newRole.setRoleName(trimmed);
                        newRole.setTeamId(sourcePayload.getTeamId());
                        newRole.setCreatedAt(OffsetDateTime.now());
                        resolvedRoles.add(teamRoleRepository.save(newRole));
                    }
                }
            }
        }

        targetMember.setRoles(resolvedRoles);
        if (!resolvedRoles.isEmpty()) {
            targetMember.setRoleInTeam(resolvedRoles.stream().map(TeamRole::getRoleName).collect(Collectors.joining(", ")));
        } else if (sourcePayload.getRoleInTeam() != null) {
            targetMember.setRoleInTeam(sourcePayload.getRoleInTeam());
        }
    }

    // CREATE
    public TeamMember createTeamMember(TeamMember teamMember) {
        validateMemberAssignment(teamMember.getUserId(), teamMember.getTeamId(), null);

        if (teamMember.getJoinedAt() == null) {
            teamMember.setJoinedAt(OffsetDateTime.now());
        }

        resolveAndAssignRoles(teamMember, teamMember);

        return teamMemberRepository.save(teamMember);
    }

    // READ ALL
    public List<TeamMember> getAllTeamMembers() {
        java.util.Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        List<TeamMember> members;
        if (allowedPids.isEmpty()) {
            members = teamMemberRepository.findAll();
        } else {
            members = teamMemberRepository.findTeamMembersByProjectIds(allowedPids.get());
        }
        return members;
    }

    // READ ONE
    public Optional<TeamMember> getTeamMemberById(Long id) {
        Optional<TeamMember> opt = teamMemberRepository.findById(id);
        if (opt.isPresent()) {
            TeamMember member = opt.get();
            if (member.getTeamId() != null) {
                Team team = teamRepository.findById(member.getTeamId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Team not found"));
                if (!projectScopeResolver.isProjectAllowed(team.getProjectId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access to project is forbidden");
                }
            }
        }
        return opt;
    }

    // UPDATE
    public TeamMember updateTeamMember(Long id, TeamMember updatedTeamMember) {
        TeamMember existingTeamMember = teamMemberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team member not found with id: " + id));

        validateMemberAssignment(updatedTeamMember.getUserId(), updatedTeamMember.getTeamId(), id);

        existingTeamMember.setTeamId(updatedTeamMember.getTeamId());
        existingTeamMember.setUserId(updatedTeamMember.getUserId());
        resolveAndAssignRoles(existingTeamMember, updatedTeamMember);

        return teamMemberRepository.save(existingTeamMember);
    }

    // DELETE
    public void deleteTeamMember(Long id) {
        Optional<TeamMember> opt = teamMemberRepository.findById(id);
        if (opt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Team member not found with id: " + id);
        }
        TeamMember member = opt.get();
        if (member.getTeamId() != null) {
            Team team = teamRepository.findById(member.getTeamId()).orElse(null);
            if (team != null && team.getProjectId() != null && !projectScopeResolver.isProjectAllowed(team.getProjectId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to remove team members from this project");
            }
        }
        member.getRoles().clear();
        teamMemberRepository.saveAndFlush(member);
        teamMemberRepository.delete(member);
    }
}