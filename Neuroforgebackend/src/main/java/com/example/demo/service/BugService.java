package com.example.demo.service;

import com.example.demo.model.Bug;
import com.example.demo.model.User;
import com.example.demo.repository.BugRepository;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.TestCaseRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class BugService {

    private final BugRepository bugRepository;
    private final ProjectScopeResolver projectScopeResolver;
    private final TaskRepository taskRepository;
    private final TestCaseRepository testCaseRepository;
    private final UserRepository userRepository;

    public BugService(BugRepository bugRepository,
                      TaskRepository taskRepository,
                      TestCaseRepository testCaseRepository,
                      UserRepository userRepository, ProjectScopeResolver projectScopeResolver) {
        this.bugRepository = bugRepository;
        this.taskRepository = taskRepository;
        this.testCaseRepository = testCaseRepository;
        this.userRepository = userRepository;
        this.projectScopeResolver = projectScopeResolver;
    }

    private Long resolveProjectIdForBug(Bug bug) {
        if (bug.getTaskId() != null) {
            return taskRepository.findById(bug.getTaskId())
                    .map(com.example.demo.model.Task::getProjectId)
                    .orElse(null);
        }
        return null;
    }

    private void validateRelationships(Bug bug) {
        if (bug.getTaskId() != null && !taskRepository.existsById(bug.getTaskId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task not found with id: " + bug.getTaskId());
        }
        if (bug.getTestcaseId() != null && !testCaseRepository.existsById(bug.getTestcaseId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test case not found with id: " + bug.getTestcaseId());
        }
        if (bug.getAssignedTo() != null) {
            User user = userRepository.findById(bug.getAssignedTo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found with id: " + bug.getAssignedTo()));
            if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot assign bug to an inactive user (" + user.getStatus() + ")");
            }
        }
    }

    private void validateBugClosurePermission(String status) {
        if ("CLOSED".equalsIgnoreCase(status)) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                boolean canClose = auth.getAuthorities().stream().anyMatch(a ->
                        a.getAuthority().equalsIgnoreCase("ROLE_TESTER") ||
                        a.getAuthority().equalsIgnoreCase("TESTER") ||
                        a.getAuthority().equalsIgnoreCase("ROLE_PROJECT_MANAGER") ||
                        a.getAuthority().equalsIgnoreCase("PROJECT_MANAGER") ||
                        a.getAuthority().equalsIgnoreCase("ROLE_ADMIN") ||
                        a.getAuthority().equalsIgnoreCase("ADMIN")
                );
                if (!canClose) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Testers, Project Managers, or Admins are authorized to close bugs");
                }
            }
        }
    }

    // CREATE
    public Bug createBug(Bug bug) {
        Long projectId = resolveProjectIdForBug(bug);
        if (projectId != null && !projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to create bugs in this project");
        }

        validateRelationships(bug);
        validateBugClosurePermission(bug.getStatus());

        if (bug.getCreatedAt() == null) {
            bug.setCreatedAt(OffsetDateTime.now());
        }

        return bugRepository.save(bug);
    }

    // READ ALL
    public List<Bug> getAllBugs() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return bugRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return bugRepository.findByProjectIds(pids);
    }

    // READ ONE
    public Optional<Bug> getBugById(Long id) {
        Bug entity = bugRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = resolveProjectIdForBug(entity);
        if (projectId != null && !projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE
    public Bug updateBug(Long id, Bug updatedBug) {
        Bug existingBug = bugRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bug not found with id: " + id));

        Long projectId = resolveProjectIdForBug(existingBug);
        if (projectId != null && !projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify bugs in this project");
        }

        validateRelationships(updatedBug);
        validateBugClosurePermission(updatedBug.getStatus());

        existingBug.setTaskId(updatedBug.getTaskId());
        existingBug.setTestcaseId(updatedBug.getTestcaseId());
        existingBug.setAssignedTo(updatedBug.getAssignedTo());
        existingBug.setTitle(updatedBug.getTitle());
        existingBug.setSeverity(updatedBug.getSeverity());
        existingBug.setPriority(updatedBug.getPriority());
        existingBug.setStatus(updatedBug.getStatus());
        existingBug.setResolution(updatedBug.getResolution());

        return bugRepository.save(existingBug);
    }

    // DELETE
    public void deleteBug(Long id) {
        Bug existingBug = bugRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bug not found with id: " + id));

        Long projectId = resolveProjectIdForBug(existingBug);
        if (projectId != null && !projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to delete bugs in this project");
        }

        bugRepository.deleteById(id);
    }
}