package com.example.demo.service;

import com.example.demo.model.Task;
import com.example.demo.model.User;
import com.example.demo.model.Sprint;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.SprintRepository;
import com.example.demo.repository.RequirementRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectScopeResolver projectScopeResolver;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final SprintRepository sprintRepository;
    private final RequirementRepository requirementRepository;
    private final UserRepository userRepository;
    private final SystemLogService systemLogService;

    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository,
                       ProjectService projectService,
                       SprintRepository sprintRepository,
                       RequirementRepository requirementRepository,
                       UserRepository userRepository,
                       ProjectScopeResolver projectScopeResolver,
                       SystemLogService systemLogService) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
        this.sprintRepository = sprintRepository;
        this.requirementRepository = requirementRepository;
        this.userRepository = userRepository;
        this.projectScopeResolver = projectScopeResolver;
        this.systemLogService = systemLogService;
    }

    private User getCurrentUser() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !"anonymousUser".equalsIgnoreCase(auth.getName())) {
            return userRepository.findByEmail(auth.getName()).orElse(null);
        }
        return null;
    }

    private boolean canUserCreateOrManageTasks(User user) {
        if (user == null || user.getRole() == null) return false;
        String role = user.getRole().toUpperCase();
        return role.contains("ADMIN") || role.contains("PROJECT_MANAGER") || role.contains("MANAGER");
    }

    private void validateRelationships(Task task) {
        if (task.getProjectId() != null) {
            if (!projectRepository.existsById(task.getProjectId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Project not found with id: " + task.getProjectId());
            }
        }
        if (task.getSprintId() != null) {
            Sprint sprint = sprintRepository.findById(task.getSprintId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint not found with id: " + task.getSprintId()));
            if (task.getProjectId() != null && !task.getProjectId().equals(sprint.getProjectId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sprint does not belong to the specified project");
            }
        }
        if (task.getRequirementId() != null && !requirementRepository.existsById(task.getRequirementId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requirement not found with id: " + task.getRequirementId());
        }
        if (task.getAssignedTo() != null) {
            User assignedUser = userRepository.findById(task.getAssignedTo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Assigned user not found with id: " + task.getAssignedTo()));
            if ("INACTIVE".equalsIgnoreCase(assignedUser.getStatus())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot assign task to an inactive user (" + assignedUser.getStatus() + ")");
            }
            if (task.getProjectId() != null) {
                List<User> eligibleMembers = projectService.getProjectMemberEntities(task.getProjectId());
                boolean isEligible = eligibleMembers.stream().anyMatch(u -> u.getUserId().equals(task.getAssignedTo()));
                if (!isEligible) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected assignee is not an active member of the selected project/team.");
                }
            }
        }
        if (task.getCreatedBy() != null && !userRepository.existsById(task.getCreatedBy())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found with id: " + task.getCreatedBy());
        }
        if (task.getStartDate() != null && task.getDueDate() != null) {
            if (task.getStartDate().isAfter(task.getDueDate())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task due date cannot be before start date.");
            }
        }
    }

    private void validateStatusTransition(String currentStatusStr, String newStatusStr, User currentUser, String newComments) {
        if (newStatusStr == null || newStatusStr.isBlank()) return;
        String currentStatus = currentStatusStr != null ? currentStatusStr.toUpperCase() : "TODO";
        String newStatus = newStatusStr.toUpperCase();

        if (currentStatus.equals(newStatus)) return;

        boolean isManagerOrAdmin = canUserCreateOrManageTasks(currentUser);

        switch (currentStatus) {
            case "TODO":
                if (!"IN_PROGRESS".equals(newStatus)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transition from TODO to " + newStatus + ". Tasks in TODO must transition to IN_PROGRESS.");
                }
                break;

            case "IN_PROGRESS":
                if (!"IN_REVIEW".equals(newStatus) && !"BLOCKED".equals(newStatus)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transition from IN_PROGRESS to " + newStatus + ". Valid next states are IN_REVIEW or BLOCKED.");
                }
                break;

            case "BLOCKED":
                if (!"IN_PROGRESS".equals(newStatus)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Blocked tasks can only transition back to IN_PROGRESS.");
                }
                break;

            case "IN_REVIEW":
                if ("COMPLETED".equals(newStatus)) {
                    if (!isManagerOrAdmin) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can approve and complete tasks.");
                    }
                } else if ("CHANGES_REQUESTED".equals(newStatus)) {
                    if (!isManagerOrAdmin) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can request changes on submitted tasks.");
                    }
                } else {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transition from IN_REVIEW to " + newStatus + ". Tasks in review can transition to COMPLETED or CHANGES_REQUESTED.");
                }
                break;

            case "CHANGES_REQUESTED":
                if (!"IN_PROGRESS".equals(newStatus)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tasks with changes requested must transition back to IN_PROGRESS for rework.");
                }
                break;

            case "COMPLETED":
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completed tasks cannot directly be moved back to " + newStatus + ".");

            default:
                break;
        }

        if ("BLOCKED".equals(newStatus)) {
            if (newComments == null || newComments.trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A comment or reason is required when marking a task as BLOCKED.");
            }
        }
    }

    // CREATE
    public Task createTask(Task task) {
        User currentUser = getCurrentUser();
        if (!canUserCreateOrManageTasks(currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators have permission to create tasks.");
        }

        if (task.getProjectId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task must belong to a valid Project.");
        }

        if (!projectScopeResolver.isProjectAllowed(task.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to create tasks for this project.");
        }

        if (currentUser != null) {
            task.setCreatedBy(currentUser.getUserId());
        }

        if (task.getStatus() == null || task.getStatus().isBlank()) {
            task.setStatus("TODO");
        } else {
            task.setStatus(task.getStatus().toUpperCase());
        }

        validateRelationships(task);

        if (task.getCreatedAt() == null) {
            task.setCreatedAt(OffsetDateTime.now());
        }

        Task saved = taskRepository.save(task);
        systemLogService.logEvent("INFO", "Task '" + saved.getTitle() + "' created in project ID " + saved.getProjectId());
        return saved;
    }

    // READ ALL
    public List<Task> getAllTasks() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return taskRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return taskRepository.findByProjectIdIn(pids);
    }

    // READ ONE
    public Optional<Task> getTaskById(Long id) {
        Task entity = taskRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE
    public Task updateTask(Long id, Task task) {
        Task existingTask = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(existingTask.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify tasks in this project");
        }

        User currentUser = getCurrentUser();
        boolean isManagerOrAdmin = canUserCreateOrManageTasks(currentUser);
        boolean isAssignedUser = currentUser != null && existingTask.getAssignedTo() != null && currentUser.getUserId().equals(existingTask.getAssignedTo());

        // Ownership & Role Access Control Check
        if (!isManagerOrAdmin && !isAssignedUser) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You are not authorized to modify tasks assigned to another team member.");
        }

        // Check assignedTo changes permission
        boolean isAssignedToChanging = (task.getAssignedTo() != null && !task.getAssignedTo().equals(existingTask.getAssignedTo()))
                || (task.getAssignedTo() == null && existingTask.getAssignedTo() != null);

        if (isAssignedToChanging && !isManagerOrAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators have permission to assign or reassign tasks.");
        }

        // Restrict non-managers from editing structural task metadata or dates
        if (!isManagerOrAdmin) {
            if (task.getProjectId() != null && !task.getProjectId().equals(existingTask.getProjectId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can reassign task projects.");
            }
            if (task.getSprintId() != null && !task.getSprintId().equals(existingTask.getSprintId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can modify task sprint association.");
            }
            if (task.getRequirementId() != null && !task.getRequirementId().equals(existingTask.getRequirementId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can modify task requirement links.");
            }
            if (task.getPriority() != null && !task.getPriority().equalsIgnoreCase(existingTask.getPriority())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can modify task priority.");
            }
            if (task.getDueDate() != null && !task.getDueDate().equals(existingTask.getDueDate())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can modify task due dates.");
            }
            if (task.getStartDate() != null && !task.getStartDate().equals(existingTask.getStartDate())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can modify task start dates.");
            }
        }

        // Validate Status Transition
        if (task.getStatus() != null && !task.getStatus().isBlank()) {
            validateStatusTransition(existingTask.getStatus(), task.getStatus(), currentUser, task.getComments());
        }

        validateRelationships(task);

        String oldStatus = existingTask.getStatus();
        Long oldAssignee = existingTask.getAssignedTo();

        existingTask.setSprintId(task.getSprintId());
        existingTask.setProjectId(task.getProjectId());
        existingTask.setRequirementId(task.getRequirementId());
        existingTask.setAssignedTo(task.getAssignedTo());
        existingTask.setTitle(task.getTitle());
        existingTask.setDescription(task.getDescription());
        existingTask.setPriority(task.getPriority());
        if (task.getStatus() != null && !task.getStatus().isBlank()) {
            existingTask.setStatus(task.getStatus().toUpperCase());
        }
        existingTask.setStartDate(task.getStartDate());
        existingTask.setDueDate(task.getDueDate());
        if (task.getComments() != null) {
            existingTask.setComments(task.getComments().trim());
        }
        existingTask.setUpdatedAt(OffsetDateTime.now());
        if (currentUser != null) {
            existingTask.setUpdatedBy(currentUser.getUserId());
        }

        Task saved = taskRepository.save(existingTask);

        if (oldStatus != null && !oldStatus.equalsIgnoreCase(saved.getStatus())) {
            systemLogService.logEvent("INFO", "Task '" + saved.getTitle() + "' status updated from " + oldStatus + " to " + saved.getStatus());
        }
        if ((oldAssignee == null && saved.getAssignedTo() != null) || (oldAssignee != null && !oldAssignee.equals(saved.getAssignedTo()))) {
            systemLogService.logEvent("INFO", "Task '" + saved.getTitle() + "' assignment updated");
        }

        return saved;
    }

    // DELETE
    public void deleteTask(Long id) {
        Task existingTask = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found with id: " + id));

        if (!projectScopeResolver.isProjectAllowed(existingTask.getProjectId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to delete tasks in this project");
        }

        User currentUser = getCurrentUser();
        if (!canUserCreateOrManageTasks(currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Administrators can delete tasks.");
        }

        taskRepository.deleteById(id);
        systemLogService.logEvent("WARN", "Task deleted: " + existingTask.getTitle());
    }
}