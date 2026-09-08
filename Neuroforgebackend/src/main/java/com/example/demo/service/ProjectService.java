package com.example.demo.service;

import com.example.demo.dto.ProjectDTO;
import com.example.demo.dto.UserDTO;
import com.example.demo.model.Project;
import com.example.demo.model.User;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.example.demo.model.Team;
import com.example.demo.model.TeamMember;
import com.example.demo.repository.TeamRepository;
import com.example.demo.repository.TeamMemberRepository;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectScopeResolver projectScopeResolver;
    private final SystemLogService systemLogService;

    public ProjectService(ProjectRepository projectRepository,
                          UserRepository userRepository,
                          TeamRepository teamRepository,
                          TeamMemberRepository teamMemberRepository,
                          ProjectScopeResolver projectScopeResolver,
                          SystemLogService systemLogService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectScopeResolver = projectScopeResolver;
        this.systemLogService = systemLogService;
    }

    private User validateProjectManager(Long managerId, boolean isNewOrReassigned, Long currentManagerId) {
        if (managerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project Manager selection is required");
        }

        User user = userRepository.findById(managerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned Project Manager not found"));

        if (isNewOrReassigned || currentManagerId == null || !managerId.equals(currentManagerId)) {
            if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project Manager account is inactive (" + user.getStatus() + ")");
            }

            String role = user.getRole();
            boolean isPmRole = role != null && (
                    role.equalsIgnoreCase("ROLE_PROJECT_MANAGER") ||
                    role.equalsIgnoreCase("PROJECT_MANAGER")
            );

            if (!isPmRole) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected user does not hold ROLE_PROJECT_MANAGER role");
            }
        }

        return user;
    }

    public ProjectDTO convertToDTO(Project project) {
        if (project == null) return null;

        ProjectDTO dto = new ProjectDTO();
        dto.setProjectId(project.getProjectId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setStatus(project.getStatus());
        dto.setStartDate(project.getStartDate());
        dto.setEndDate(project.getEndDate());
        dto.setCreatedBy(project.getCreatedBy());
        
        Long managerId = project.getProjectManagerId();
        dto.setProjectManagerId(managerId);

        if (managerId != null) {
            userRepository.findById(managerId).ifPresentOrElse(pm -> {
                dto.setProjectManagerName(pm.getFullName());
                dto.setProjectManagerEmail(pm.getEmail());
                dto.setProjectManagerStatus(pm.getStatus());
                dto.setProjectManagerRole(pm.getRole());
            }, () -> {
                dto.setProjectManagerName("Unknown / Deleted Manager");
                dto.setProjectManagerStatus("DELETED");
            });
        }

        return dto;
    }

    // CREATE
    public ProjectDTO createProject(Project project) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth != null ? auth.getName() : null;
        if (currentUsername == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User authentication required");
        }

        User currentUser = userRepository.findByEmail(currentUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user account not found"));

        String userRole = currentUser.getRole();
        boolean isAdmin = userRole != null && (userRole.equalsIgnoreCase("ROLE_ADMIN") || userRole.equalsIgnoreCase("ADMIN"));

        project.setCreatedBy(currentUser.getUserId());

        if (isAdmin) {
            Long pmId = project.getProjectManagerId();
            if (pmId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin must select an eligible Project Manager for this project");
            }
            User pm = validateProjectManager(pmId, true, null);
            project.setProjectManagerId(pm.getUserId());
        } else {
            User pm = validateProjectManager(currentUser.getUserId(), true, null);
            project.setProjectManagerId(pm.getUserId());
        }

        Project saved = projectRepository.save(project);
        User assignedPm = userRepository.findById(saved.getProjectManagerId()).orElse(currentUser);
        systemLogService.logEvent("INFO", "Project '" + saved.getName() + "' created with Project Manager: " + assignedPm.getFullName());

        return convertToDTO(saved);
    }

    // READ ALL
    public List<ProjectDTO> getAllProjects() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        List<Project> projects;
        if (allowedPids.isEmpty()) {
            projects = projectRepository.findAll();
        } else {
            List<Long> pids = allowedPids.get();
            if (pids.isEmpty() || pids.contains(-999L)) {
                return Collections.emptyList();
            }
            projects = projectRepository.findByProjectIdIn(pids);
        }

        return projects.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    // READ ONE
    public Optional<ProjectDTO> getProjectById(Long id) {
        Project entity = projectRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();

        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(convertToDTO(entity));
    }

    // UPDATE
    public ProjectDTO updateProject(Long id, Project projectDetails) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify this project");
        }

        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String currentUsername = auth != null ? auth.getName() : null;
        User currentUser = currentUsername != null ? userRepository.findByEmail(currentUsername).orElse(null) : null;
        boolean isAdmin = currentUser != null && currentUser.getRole() != null &&
                (currentUser.getRole().equalsIgnoreCase("ROLE_ADMIN") || currentUser.getRole().equalsIgnoreCase("ADMIN"));

        Long oldPmId = project.getProjectManagerId();
        Long newPmId = oldPmId;

        if (isAdmin && projectDetails.getProjectManagerId() != null) {
            newPmId = projectDetails.getProjectManagerId();
        }

        boolean pmChanged = newPmId != null && !newPmId.equals(oldPmId);
        User newPm = null;
        if (pmChanged || oldPmId == null) {
            newPm = validateProjectManager(newPmId, true, oldPmId);
        } else if (newPmId != null) {
            newPm = validateProjectManager(newPmId, false, oldPmId);
        }

        String oldPmName = "Unassigned";
        if (oldPmId != null) {
            oldPmName = userRepository.findById(oldPmId).map(User::getFullName).orElse("Unknown Manager");
        }

        project.setName(projectDetails.getName());
        project.setDescription(projectDetails.getDescription());
        project.setStatus(projectDetails.getStatus());
        project.setStartDate(projectDetails.getStartDate());
        project.setEndDate(projectDetails.getEndDate());
        if (newPm != null) {
            project.setProjectManagerId(newPm.getUserId());
        }

        Project saved = projectRepository.save(project);

        if (pmChanged && newPm != null) {
            systemLogService.logEvent("INFO", "Project '" + saved.getName() + "' Project Manager changed from " + oldPmName + " to " + newPm.getFullName());
        } else {
            systemLogService.logEvent("INFO", "Project '" + saved.getName() + "' updated");
        }

        return convertToDTO(saved);
    }

    // DELETE
    public void deleteProject(Long id) {
        if (!projectRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found with id: " + id);
        }
        if (!projectScopeResolver.isProjectAllowed(id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to delete this project");
        }
        Project project = projectRepository.findById(id).orElse(null);
        String projName = project != null ? project.getName() : String.valueOf(id);
        projectRepository.deleteById(id);
        systemLogService.logEvent("WARN", "Project deleted: " + projName);
    }

    // READ PROJECT MEMBER ENTITIES
    public List<User> getProjectMemberEntities(Long projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) {
            return Collections.emptyList();
        }

        Set<Long> memberUserIds = new HashSet<>();
        if (project.getProjectManagerId() != null) {
            memberUserIds.add(project.getProjectManagerId());
        }
        if (project.getCreatedBy() != null) {
            memberUserIds.add(project.getCreatedBy());
        }

        List<Team> teams = teamRepository.findByProjectId(projectId);
        if (teams != null && !teams.isEmpty()) {
            List<Long> teamIds = teams.stream().map(Team::getTeamId).collect(Collectors.toList());
            if (!teamIds.isEmpty()) {
                List<TeamMember> teamMembers = teamMemberRepository.findByTeamIdIn(teamIds);
                if (teamMembers != null) {
                    for (TeamMember tm : teamMembers) {
                        if (tm.getUserId() != null) {
                            memberUserIds.add(tm.getUserId());
                        }
                    }
                }
            }
        }

        if (memberUserIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<User> users = userRepository.findAllById(memberUserIds);
        return users.stream()
                .filter(u -> u.getStatus() == null || !"INACTIVE".equalsIgnoreCase(u.getStatus()))
                .collect(Collectors.toList());
    }

    // READ PROJECT MEMBERS DTO
    public List<UserDTO> getProjectMembers(Long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found with id: " + projectId);
        }
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to project resources");
        }
        return getProjectMemberEntities(projectId)
                .stream()
                .map(u -> new UserDTO(u.getUserId(), u.getFullName(), u.getEmail(), u.getRole(), u.getStatus()))
                .collect(Collectors.toList());
    }
}