package com.example.demo.service;

import com.example.demo.model.Requirement;
import com.example.demo.model.User;
import com.example.demo.repository.RequirementRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
public class RequirementService {

    private final RequirementRepository requirementRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public RequirementService(RequirementRepository requirementRepository,
                              ProjectRepository projectRepository,
                              UserRepository userRepository,
                              ProjectScopeResolver projectScopeResolver) {
        this.requirementRepository = requirementRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectScopeResolver = projectScopeResolver;
    }

    private String getCurrentUserEmail() {
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            if (email != null && !email.isBlank() && !"anonymousUser".equalsIgnoreCase(email)) {
                return email;
            }
        }
        return "system";
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

    // CREATE
    public Requirement createRequirement(Requirement requirement) {
        if (requirement.getDescription() == null || requirement.getDescription().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requirement description cannot be empty");
        }
        if (requirement.getProjectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid project association is required");
        }
        if (!projectRepository.existsById(requirement.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project not found with id: " + requirement.getProjectId());
        }
        if (!projectScopeResolver.isProjectAllowed(requirement.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to create requirements for this project");
        }

        String userRole = getCurrentUserRole();
        boolean isAdmin = userRole.contains("ADMIN");
        boolean isPM = userRole.contains("PROJECT_MANAGER") || userRole.contains("MANAGER");
        if (!isAdmin && !isPM) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can define new requirements.");
        }

        // Requirements always start in DRAFT
        requirement.setStatus("DRAFT");
        if (requirement.getPriority() == null || requirement.getPriority().isBlank()) {
            requirement.setPriority("MEDIUM");
        }
        requirement.setUpdatedAt(OffsetDateTime.now());
        requirement.setUpdatedBy(getCurrentUserEmail());

        return requirementRepository.save(requirement);
    }

    // READ ALL
    public List<Requirement> getAllRequirements() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return requirementRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return requirementRepository.findByProjectIdIn(pids);
    }

    // READ ONE
    public Optional<Requirement> getRequirementById(Long id) {
        Requirement entity = requirementRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();

        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // CONTROLLED STAGE TRANSITION: DRAFT -> APPROVED -> IMPLEMENTED -> VERIFIED
    public Requirement transitionRequirement(Long id, String targetStatus) {
        Requirement existing = requirementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Requirement not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(existing.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify requirements for this project");
        }

        if (targetStatus == null || targetStatus.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target status is required for transition");
        }

        String userRole = getCurrentUserRole();
        boolean isAdmin = userRole.contains("ADMIN");
        boolean isPM = userRole.contains("PROJECT_MANAGER") || userRole.contains("MANAGER");
        boolean isDev = userRole.contains("DEVELOPER");
        boolean isTester = userRole.contains("TESTER");

        String fromStatus = existing.getStatus() != null ? existing.getStatus().toUpperCase() : "DRAFT";
        String toStatus = targetStatus.trim().toUpperCase();

        if (fromStatus.equals(toStatus)) {
            return existing;
        }

        // STRICT 4-STAGE PIPELINE: DRAFT -> APPROVED -> IMPLEMENTED -> VERIFIED
        if ("DRAFT".equals(fromStatus) && "APPROVED".equals(toStatus)) {
            if (!isAdmin && !isPM) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can approve requirements.");
            }
        } else if ("APPROVED".equals(fromStatus) && "IMPLEMENTED".equals(toStatus)) {
            if (!isAdmin && !isPM && !isDev) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Developers, Project Managers, or Administrators can mark requirements as implemented.");
            }
        } else if ("IMPLEMENTED".equals(fromStatus) && "VERIFIED".equals(toStatus)) {
            if (!isAdmin && !isPM && !isTester) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Testers, Project Managers, or Administrators can verify requirements.");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "Invalid lifecycle stage transition from " + fromStatus + " to " + toStatus + ". Valid path: DRAFT -> APPROVED -> IMPLEMENTED -> VERIFIED.");
        }

        existing.setStatus(toStatus);
        existing.setUpdatedAt(OffsetDateTime.now());
        existing.setUpdatedBy(getCurrentUserEmail());

        return requirementRepository.save(existing);
    }

    // UPDATE DETAILS (EDIT CONTENT WITH AUDIT LOG & APPROVED/VERIFIED -> DRAFT RESET RULE)
    public Requirement updateRequirement(Long id, Requirement requirement) {
        Requirement existing = requirementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Requirement not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(existing.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify requirements for this project");
        }

        String userRole = getCurrentUserRole();
        boolean isAdmin = userRole.contains("ADMIN");
        boolean isPM = userRole.contains("PROJECT_MANAGER") || userRole.contains("MANAGER");
        boolean isDev = userRole.contains("DEVELOPER");
        boolean isTester = userRole.contains("TESTER");

        if (!isAdmin && !isPM && !isDev && !isTester) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You do not have permission to modify requirement details.");
        }

        if (requirement.getProjectId() != null && !projectRepository.existsById(requirement.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project not found with id: " + requirement.getProjectId());
        }

        String newDescription = requirement.getDescription() != null ? requirement.getDescription().trim() : null;
        String newPriority = requirement.getPriority() != null ? requirement.getPriority().trim() : null;

        boolean descriptionChanged = newDescription != null && !newDescription.equals(existing.getDescription());
        boolean priorityChanged = newPriority != null && !newPriority.equalsIgnoreCase(existing.getPriority());
        boolean projectChanged = requirement.getProjectId() != null && !requirement.getProjectId().equals(existing.getProjectId());

        boolean contentModified = descriptionChanged || priorityChanged || projectChanged;

        if (contentModified) {
            // Save audit history of previous description
            if (existing.getDescription() != null) {
                existing.setPreviousContent(existing.getDescription());
            }

            if (newDescription != null) existing.setDescription(newDescription);
            if (newPriority != null) existing.setPriority(newPriority);
            if (requirement.getProjectId() != null) existing.setProjectId(requirement.getProjectId());

            existing.setUpdatedAt(OffsetDateTime.now());
            existing.setUpdatedBy(getCurrentUserEmail());

            // LIFECYCLE RESET RULE: If an APPROVED, IMPLEMENTED, or VERIFIED requirement is edited, reset lifecycle to DRAFT
            String currentStatus = existing.getStatus() != null ? existing.getStatus().toUpperCase() : "DRAFT";
            if (!"DRAFT".equals(currentStatus)) {
                existing.setStatus("DRAFT");
            }
        }

        return requirementRepository.save(existing);
    }

    // DELETE
    public void deleteRequirement(Long id) {
        Requirement existing = requirementRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Requirement not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(existing.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to delete requirements for this project");
        }

        String userRole = getCurrentUserRole();
        boolean isAdmin = userRole.contains("ADMIN");
        boolean isPM = userRole.contains("PROJECT_MANAGER") || userRole.contains("MANAGER");
        if (!isAdmin && !isPM) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can delete requirements.");
        }

        requirementRepository.deleteById(id);
    }
}