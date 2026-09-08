package com.example.demo.service;

import com.example.demo.model.Team;
import com.example.demo.repository.TeamRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public TeamService(TeamRepository teamRepository, ProjectScopeResolver projectScopeResolver) {
        this.teamRepository = teamRepository;
    
        this.projectScopeResolver = projectScopeResolver;
    
    }

    // CREATE
    public Team createTeam(Team team) {

        if (team.getCreatedAt() == null) {
            team.setCreatedAt(OffsetDateTime.now());
        }

        return teamRepository.save(team);
    }

    // READ ALL
    public List<Team> getAllTeams() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return teamRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return teamRepository.findByProjectIdIn(pids);
    }

    // READ ONE
    public Optional<Team> getTeamById(Long id) {
        Team entity = teamRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE
    public Team updateTeam(Long id, Team updatedTeam) {

        Team existingTeam = teamRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Team not found with id: " + id));

        existingTeam.setProjectId(updatedTeam.getProjectId());
        existingTeam.setTeamName(updatedTeam.getTeamName());

        return teamRepository.save(existingTeam);
    }

    // DELETE
    public void deleteTeam(Long id) {

        if (!teamRepository.existsById(id)) {
            throw new RuntimeException("Team not found with id: " + id);
        }

        teamRepository.deleteById(id);
    }
}