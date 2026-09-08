package com.example.demo.service;

import com.example.demo.model.Sprint;
import com.example.demo.model.User;
import com.example.demo.repository.SprintRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public SprintService(SprintRepository sprintRepository,
                         ProjectRepository projectRepository,
                         UserRepository userRepository,
                         ProjectScopeResolver projectScopeResolver) {
        this.sprintRepository = sprintRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectScopeResolver = projectScopeResolver;
    }

    private String getCurrentUserRole() {
        org.springframework.security.core.Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            StringBuilder sb = new StringBuilder();
            if (auth.getAuthorities() != null) {
                for (org.springframework.security.core.GrantedAuthority ga : auth.getAuthorities()) {
                    if (ga != null && ga.getAuthority() != null) {
                        sb.append(ga.getAuthority().toUpperCase()).append(" ");
                    }
                }
            }
            String email = auth.getName();
            if (email != null && !email.isBlank() && !"anonymousUser".equalsIgnoreCase(email)) {
                Optional<User> userOpt = userRepository.findByEmail(email);
                if (userOpt.isPresent() && userOpt.get().getRole() != null) {
                    sb.append(userOpt.get().getRole().toUpperCase()).append(" ");
                }
            }
            return sb.toString();
        }
        return "ROLE_USER";
    }

    // CREATE SPRINT
    public Sprint createSprint(Sprint sprint) {
        String userRole = getCurrentUserRole();
        boolean isAdmin = userRole.contains("ADMIN");
        boolean isPM = userRole.contains("PROJECT_MANAGER") || userRole.contains("MANAGER");

        if (!isAdmin && !isPM) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can create sprints.");
        }

        if (sprint.getSprintName() == null || sprint.getSprintName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint name is required");
        }

        if (sprint.getProjectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project selection is required");
        }
        if (!projectRepository.existsById(sprint.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project not found with id: " + sprint.getProjectId());
        }
        if (!projectScopeResolver.isProjectAllowed(sprint.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to create sprints in this project");
        }

        if (sprint.getStartDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint start date is required");
        }
        if (sprint.getEndDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint end date is required");
        }
        if (sprint.getStartDate().isAfter(sprint.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint end date cannot be before start date.");
        }

        // Newly created sprints MUST automatically be assigned PLANNED status
        sprint.setSprintName(sprint.getSprintName().trim());
        if (sprint.getGoal() != null) {
            sprint.setGoal(sprint.getGoal().trim());
        }
        sprint.setStatus("PLANNED");

        return sprintRepository.save(sprint);
    }

    // READ ALL
    public List<Sprint> getAllSprints() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return sprintRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return sprintRepository.findByProjectIdIn(pids);
    }

    // READ ONE
    public Optional<Sprint> getSprintById(Long id) {
        Sprint entity = sprintRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();

        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE SPRINT
    public Sprint updateSprint(Long id, Sprint sprint) {
        Sprint existingSprint = sprintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(existingSprint.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify sprints in this project");
        }

        String userRole = getCurrentUserRole();
        boolean isAdmin = userRole.contains("ADMIN");
        boolean isPM = userRole.contains("PROJECT_MANAGER") || userRole.contains("MANAGER");

        if (!isAdmin && !isPM) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can manage sprint parameters or lifecycle.");
        }

        if (sprint.getProjectId() != null && !projectRepository.existsById(sprint.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project not found with id: " + sprint.getProjectId());
        }

        if (sprint.getSprintName() != null) {
            if (sprint.getSprintName().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint name cannot be empty");
            }
            existingSprint.setSprintName(sprint.getSprintName().trim());
        }

        if (sprint.getGoal() != null) {
            existingSprint.setGoal(sprint.getGoal().trim());
        }

        if (sprint.getStartDate() != null) {
            existingSprint.setStartDate(sprint.getStartDate());
        }
        if (sprint.getEndDate() != null) {
            existingSprint.setEndDate(sprint.getEndDate());
        }

        if (existingSprint.getStartDate() != null && existingSprint.getEndDate() != null) {
            if (existingSprint.getStartDate().isAfter(existingSprint.getEndDate())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint end date cannot be before start date.");
            }
        }

        if (sprint.getStatus() != null && !sprint.getStatus().isBlank()) {
            String newStatus = sprint.getStatus().toUpperCase();
            String currentStatus = existingSprint.getStatus() != null ? existingSprint.getStatus().toUpperCase() : "PLANNED";
            
            if (!currentStatus.equals(newStatus)) {
                // Validate lifecycle transition: PLANNED -> ACTIVE -> COMPLETED
                if ("PLANNED".equals(currentStatus) && "ACTIVE".equals(newStatus)) {
                    existingSprint.setStatus("ACTIVE");
                } else if ("ACTIVE".equals(currentStatus) && "COMPLETED".equals(newStatus)) {
                    existingSprint.setStatus("COMPLETED");
                } else {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid sprint status transition from " + currentStatus + " to " + newStatus + ". Valid flow: PLANNED -> ACTIVE -> COMPLETED.");
                }
            }
        }

        if (sprint.getProjectId() != null) {
            existingSprint.setProjectId(sprint.getProjectId());
        }

        return sprintRepository.save(existingSprint);
    }

    // DELETE
    public void deleteSprint(Long id) {
        Sprint existingSprint = sprintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(existingSprint.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to delete sprints in this project");
        }

        String userRole = getCurrentUserRole();
        boolean isAdmin = userRole.contains("ADMIN");
        boolean isPM = userRole.contains("PROJECT_MANAGER") || userRole.contains("MANAGER");

        if (!isAdmin && !isPM) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can delete sprints.");
        }

        sprintRepository.deleteById(id);
    }
}