package com.example.demo.service;

import com.example.demo.model.TeamRole;
import com.example.demo.repository.TeamRoleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TeamRoleService {

    private final TeamRoleRepository teamRoleRepository;

    public TeamRoleService(TeamRoleRepository teamRoleRepository) {
        this.teamRoleRepository = teamRoleRepository;
    }

    public List<TeamRole> getRolesForTeam(Long teamId) {
        if (teamId == null) {
            return teamRoleRepository.findAll();
        }
        return teamRoleRepository.findAvailableRolesForTeam(teamId);
    }

    public TeamRole createTeamRole(TeamRole rolePayload) {
        if (rolePayload == null || rolePayload.getRoleName() == null || rolePayload.getRoleName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role name is required");
        }

        String formattedName = rolePayload.getRoleName().trim();
        Long teamId = rolePayload.getTeamId();

        // Case-insensitive check for existing role in target scope
        Optional<TeamRole> existingOpt;
        if (teamId != null) {
            existingOpt = teamRoleRepository.findByRoleNameIgnoreCaseAndTeamId(formattedName, teamId);
            if (existingOpt.isEmpty()) {
                existingOpt = teamRoleRepository.findByRoleNameIgnoreCaseAndTeamIdIsNull(formattedName);
            }
        } else {
            existingOpt = teamRoleRepository.findByRoleNameIgnoreCaseAndTeamIdIsNull(formattedName);
        }

        if (existingOpt.isPresent()) {
            return existingOpt.get();
        }

        TeamRole newRole = new TeamRole();
        newRole.setRoleName(formattedName);
        newRole.setTeamId(teamId);
        newRole.setCreatedAt(OffsetDateTime.now());

        return teamRoleRepository.save(newRole);
    }

    public Optional<TeamRole> getRoleById(Long id) {
        return teamRoleRepository.findById(id);
    }

    public void deleteRole(Long id) {
        if (!teamRoleRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Team role not found with ID: " + id);
        }
        teamRoleRepository.deleteById(id);
    }
}
