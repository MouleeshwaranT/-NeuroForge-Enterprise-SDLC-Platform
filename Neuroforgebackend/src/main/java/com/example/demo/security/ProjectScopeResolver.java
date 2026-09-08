package com.example.demo.security;

import com.example.demo.model.User;
import com.example.demo.repository.TeamMemberRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
public class ProjectScopeResolver {

    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final com.example.demo.repository.ProjectRepository projectRepository;

    public ProjectScopeResolver(UserRepository userRepository,
                                TeamMemberRepository teamMemberRepository,
                                com.example.demo.repository.ProjectRepository projectRepository) {
        this.userRepository = userRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
    }

    public Optional<List<Long>> getResolvedProjectIds() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        if (email == null || "anonymousUser".equals(email)) {
            return Optional.of(Collections.emptyList());
        }

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return Optional.of(Collections.emptyList());
        }

        String role = user.getRole();
        if (role != null && (role.equalsIgnoreCase("ADMIN") || role.equalsIgnoreCase("ROLE_ADMIN") || role.toUpperCase().contains("ADMIN"))) {
            return Optional.empty(); // Unrestricted
        }

        List<Long> pids = new java.util.ArrayList<>(teamMemberRepository.findProjectIdsByUserId(user.getUserId()));
        List<Long> managedPids = projectRepository.findProjectIdsByManagerId(user.getUserId());
        for (Long mp : managedPids) {
            if (mp != null && !pids.contains(mp)) {
                pids.add(mp);
            }
        }

        if (pids.isEmpty()) {
            return Optional.of(Collections.singletonList(-999L)); // Dummy ID to prevent matching any valid project
        }
        return Optional.of(pids);
    }

    public boolean isProjectAllowed(Long projectId) {
        if (projectId == null) {
            return false;
        }
        Optional<List<Long>> allowedPids = getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return true; // Admin has access to all
        }
        return allowedPids.get().contains(projectId);
    }
}
