package com.example.demo.service;

import com.example.demo.dto.EmailResult;
import com.example.demo.dto.UserDTO;
import com.example.demo.dto.UserOnboardingResult;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final com.example.demo.security.ProjectScopeResolver projectScopeResolver;
    private final com.example.demo.repository.TeamMemberRepository teamMemberRepository;
    private final SystemLogService systemLogService;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, 
                       org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                       com.example.demo.security.ProjectScopeResolver projectScopeResolver,
                       com.example.demo.repository.TeamMemberRepository teamMemberRepository,
                       SystemLogService systemLogService,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.projectScopeResolver = projectScopeResolver;
        this.teamMemberRepository = teamMemberRepository;
        this.systemLogService = systemLogService;
        this.emailService = emailService;
    }

    private String encodePasswordIfNeeded(String password) {
        if (password == null) return null;
        if (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")) {
            return password;
        }
        return passwordEncoder.encode(password);
    }

    // CREATE / ONBOARD
    public UserOnboardingResult createUser(User user) {
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Email is required");
        }
        if (user.getFullName() == null || user.getFullName().trim().isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Full name is required");
        }

        String trimmedEmail = user.getEmail().trim();
        if (userRepository.findByEmail(trimmedEmail).isPresent()) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT, "Email is already registered");
        }

        user.setEmail(trimmedEmail);
        user.setFullName(user.getFullName().trim());

        if (user.getRole() == null || user.getRole().trim().isEmpty()) {
            user.setRole("ROLE_USER");
        } else if (!user.getRole().startsWith("ROLE_")) {
            user.setRole("ROLE_" + user.getRole().trim());
        }

        if (user.getCreatedAt() == null) {
            user.setCreatedAt(OffsetDateTime.now());
        }

        // Set account status to INVITED unless explicitly set
        if (user.getStatus() == null || user.getStatus().isBlank()) {
            user.setStatus("INVITED");
        }

        // Generate secure 24-hour invitation token & secure random password hash
        String invitationToken = java.util.UUID.randomUUID().toString();
        user.setResetToken(invitationToken);
        user.setResetTokenExpiry(OffsetDateTime.now().plusHours(24));
        user.setPasswordHash(passwordEncoder.encode(java.util.UUID.randomUUID().toString()));

        User saved = userRepository.save(user);
        systemLogService.logEvent("INFO", "User invitation created for account: " + saved.getEmail());
        
        // Dispatch invitation email via JavaMailSender & capture exact result
        EmailResult emailResult = emailService.sendInvitationEmail(saved.getEmail(), saved.getFullName(), invitationToken);

        return new UserOnboardingResult(saved, emailResult.isSuccess(), emailResult.getErrorMessage());
    }

    // RESEND INVITATION
    public UserOnboardingResult resendInvitation(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found with ID: " + userId));

        // Refresh secure 24-hour invitation token
        String newToken = java.util.UUID.randomUUID().toString();
        user.setResetToken(newToken);
        user.setResetTokenExpiry(OffsetDateTime.now().plusHours(24));

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            user.setStatus("INVITED");
        }

        User saved = userRepository.save(user);
        systemLogService.logEvent("INFO", "User invitation resent for account: " + saved.getEmail());

        EmailResult emailResult = emailService.sendInvitationEmail(saved.getEmail(), saved.getFullName(), newToken);

        return new UserOnboardingResult(saved, emailResult.isSuccess(), emailResult.getErrorMessage());
    }

    // READ ALL
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // READ ELIGIBLE PROJECT MANAGERS
    public List<UserDTO> getEligibleProjectManagers() {
        return userRepository.findEligibleProjectManagers()
                .stream()
                .map(u -> new UserDTO(u.getUserId(), u.getFullName(), u.getEmail(), u.getRole(), u.getStatus()))
                .collect(Collectors.toList());
    }

    // READ ONE
    public Optional<User> getUserById(Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            java.util.Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
            if (allowedPids.isPresent()) {
                String currentEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
                if (!userOpt.get().getEmail().equalsIgnoreCase(currentEmail)) {
                    List<Long> targetPids = teamMemberRepository.findProjectIdsByUserId(id);
                    boolean hasIntersection = false;
                    for (Long pid : targetPids) {
                        if (allowedPids.get().contains(pid)) {
                            hasIntersection = true;
                            break;
                        }
                    }
                    if (!hasIntersection) {
                        throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Access to user is forbidden");
                    }
                }
            }
        }
        return userOpt;
    }

    // UPDATE
    public User updateUser(Long id, User updatedUser) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found with id: " + id));

        String callerEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null ?
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName() : null;

        if (callerEmail != null && callerEmail.equalsIgnoreCase(existingUser.getEmail())) {
            if (updatedUser.getStatus() != null && "INACTIVE".equalsIgnoreCase(updatedUser.getStatus())) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Administrators cannot deactivate their own active account");
            }
            if (updatedUser.getRole() != null && !updatedUser.getRole().trim().isEmpty()) {
                String newRole = updatedUser.getRole();
                if (!newRole.startsWith("ROLE_")) newRole = "ROLE_" + newRole;
                if (!newRole.equalsIgnoreCase("ROLE_ADMIN") && !newRole.equalsIgnoreCase("ADMIN")) {
                    throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Administrators cannot strip their own Admin platform role");
                }
            }
        }

        if (updatedUser.getFullName() != null && !updatedUser.getFullName().trim().isEmpty()) {
            existingUser.setFullName(updatedUser.getFullName());
        }
        if (updatedUser.getEmail() != null && !updatedUser.getEmail().trim().isEmpty()) {
            existingUser.setEmail(updatedUser.getEmail());
        }
        if (updatedUser.getPasswordHash() != null && !updatedUser.getPasswordHash().trim().isEmpty()) {
            existingUser.setPasswordHash(encodePasswordIfNeeded(updatedUser.getPasswordHash()));
        }
        if (updatedUser.getRole() != null && !updatedUser.getRole().trim().isEmpty()) {
            String newRole = updatedUser.getRole();
            if (!newRole.startsWith("ROLE_")) newRole = "ROLE_" + newRole;
            systemLogService.logEvent("WARN", "User role changed for " + existingUser.getEmail() + " from " + existingUser.getRole() + " to " + newRole);
            existingUser.setRole(newRole);
        }
        if (updatedUser.getStatus() != null) {
            existingUser.setStatus(updatedUser.getStatus());
        }
        if (updatedUser.getPhone() != null) {
            existingUser.setPhone(updatedUser.getPhone());
        }

        return userRepository.save(existingUser);
    }

    // UPDATE STATUS
    public User updateUserStatus(Long id, String status) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "User not found with id: " + id));

        String callerEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null ?
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName() : null;

        String targetStatus = status != null ? status.toUpperCase() : "INACTIVE";
        if (callerEmail != null && callerEmail.equalsIgnoreCase(user.getEmail()) && "INACTIVE".equalsIgnoreCase(targetStatus)) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Administrators cannot deactivate their own active account");
        }

        String oldStatus = user.getStatus();
        user.setStatus(targetStatus);
        User saved = userRepository.save(user);
        systemLogService.logEvent("WARN", "User status changed for " + saved.getEmail() + " from " + oldStatus + " to " + saved.getStatus());
        return saved;
    }

    // DELETE
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        userRepository.deleteById(id);
        systemLogService.logEvent("WARN", "User account deleted: " + user.getEmail());
    }
}