package com.example.demo.config;

import com.example.demo.model.TeamMember;
import com.example.demo.model.TeamRole;
import com.example.demo.model.User;
import com.example.demo.repository.TeamMemberRepository;
import com.example.demo.repository.TeamRoleRepository;
import com.example.demo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.*;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TeamRoleRepository teamRoleRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final com.example.demo.repository.ProjectRepository projectRepository;

    @Value("${admin.email:${ADMIN_EMAIL:admin@neuroforge.com}}")
    private String adminEmail;

    @Value("${admin.password:${ADMIN_PASSWORD:AdminPass123!}}")
    private String adminPassword;

    public DataInitializer(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           TeamRoleRepository teamRoleRepository,
                           TeamMemberRepository teamMemberRepository,
                           com.example.demo.repository.ProjectRepository projectRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.teamRoleRepository = teamRoleRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        initializeAdminUser();
        initializeDefaultProjectManagerUser();
        initializeTeamRolesAndMigrateData();
        migrateProjectManagers();
    }

    private void initializeDefaultProjectManagerUser() {
        if (userRepository.existsByRole("ROLE_PROJECT_MANAGER") || userRepository.existsByRole("PROJECT_MANAGER")) {
            logger.info(">>> Project Manager Bootstrap: Existing ROLE_PROJECT_MANAGER account detected in database.");
            return;
        }

        User pm = new User();
        pm.setFullName("Rahul Sharma");
        pm.setEmail("rahul.pm@neuroforge.com");
        pm.setPasswordHash(passwordEncoder.encode("PmPass123!"));
        pm.setRole("ROLE_PROJECT_MANAGER");
        pm.setStatus("ACTIVE");
        pm.setCreatedAt(OffsetDateTime.now());

        userRepository.save(pm);
        logger.info(">>> Project Manager Bootstrap: Initial Project Manager account created successfully for email: rahul.pm@neuroforge.com");
    }

    private void migrateProjectManagers() {
        List<com.example.demo.model.Project> projects = projectRepository.findAll();
        for (com.example.demo.model.Project p : projects) {
            if (p.getProjectManagerId() == null) {
                if (p.getCreatedBy() != null) {
                    p.setProjectManagerId(p.getCreatedBy());
                } else {
                    userRepository.findAll().stream()
                        .filter(u -> u.getRole() != null && (u.getRole().equalsIgnoreCase("ROLE_PROJECT_MANAGER") || u.getRole().equalsIgnoreCase("PROJECT_MANAGER")))
                        .findFirst()
                        .ifPresent(u -> p.setProjectManagerId(u.getUserId()));
                }
                projectRepository.save(p);
                logger.info("Migrated project ID {} ('{}') to projectManagerId: {}", p.getProjectId(), p.getName(), p.getProjectManagerId());
            }
        }
    }

    private void initializeAdminUser() {
        if (userRepository.existsByRole("ROLE_ADMIN") || userRepository.existsByRole("ADMIN")) {
            logger.info(">>> First-Admin Bootstrap: Existing ROLE_ADMIN account detected in database.");
            return;
        }

        if (adminEmail != null && !adminEmail.isBlank() && adminPassword != null && !adminPassword.isBlank()) {
            User admin = new User();
            admin.setFullName("System Admin");
            admin.setEmail(adminEmail.trim());
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setRole("ROLE_ADMIN");
            admin.setStatus("ACTIVE");
            admin.setCreatedAt(OffsetDateTime.now());

            userRepository.save(admin);
            logger.info(">>> First-Admin Bootstrap: Initial Admin account created successfully for email: {}", adminEmail.trim());
        }
    }

    private void initializeTeamRolesAndMigrateData() {
        List<String> defaultRoles = Arrays.asList(
            "Technical Lead",
            "Scrum Master",
            "Software Architect",
            "Developer",
            "QA Engineer",
            "DevOps Engineer",
            "Business Analyst",
            "Product Owner",
            "Release Manager",
            "Security Engineer",
            "Data Engineer"
        );

        for (String roleName : defaultRoles) {
            if (!teamRoleRepository.existsByRoleNameIgnoreCaseAndTeamIdIsNull(roleName)) {
                TeamRole role = new TeamRole();
                role.setRoleName(roleName);
                role.setTeamId(null);
                role.setCreatedAt(OffsetDateTime.now());
                teamRoleRepository.save(role);
            }
        }

        // Migrate existing team members with legacy role_in_team strings to relational team_member_role
        List<TeamMember> members = teamMemberRepository.findAll();
        for (TeamMember member : members) {
            if ((member.getRoles() == null || member.getRoles().isEmpty()) && member.getRoleInTeam() != null && !member.getRoleInTeam().isBlank()) {
                String[] parts = member.getRoleInTeam().split(",");
                Set<TeamRole> resolvedRoles = new HashSet<>();
                for (String part : parts) {
                    String trimmed = part.trim();
                    if (!trimmed.isEmpty()) {
                        Optional<TeamRole> roleOpt = teamRoleRepository.findByRoleNameIgnoreCaseAndTeamId(trimmed, member.getTeamId());
                        if (roleOpt.isEmpty()) {
                            roleOpt = teamRoleRepository.findByRoleNameIgnoreCaseAndTeamIdIsNull(trimmed);
                        }
                        if (roleOpt.isPresent()) {
                            resolvedRoles.add(roleOpt.get());
                        } else {
                            TeamRole newRole = new TeamRole();
                            newRole.setRoleName(trimmed);
                            newRole.setTeamId(member.getTeamId());
                            newRole.setCreatedAt(OffsetDateTime.now());
                            resolvedRoles.add(teamRoleRepository.save(newRole));
                        }
                    }
                }
                member.setRoles(resolvedRoles);
                teamMemberRepository.save(member);
            }
        }
    }
}
