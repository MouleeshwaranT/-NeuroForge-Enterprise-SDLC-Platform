package com.example.demo.repository;

import com.example.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByResetToken(String resetToken);

    boolean existsByRole(String role);

    @Query("SELECT DISTINCT u FROM User u JOIN TeamMember tm ON u.userId = tm.userId JOIN Team t ON tm.teamId = t.teamId WHERE t.projectId IN :projectIds")
    List<User> findUsersInProjects(@Param("projectIds") List<Long> projectIds);

    @Query("SELECT u FROM User u WHERE UPPER(u.role) IN ('ROLE_PROJECT_MANAGER', 'PROJECT_MANAGER') AND UPPER(u.status) = 'ACTIVE'")
    List<User> findEligibleProjectManagers();

    @Query("SELECT DISTINCT u FROM User u WHERE (u.status IS NULL OR UPPER(u.status) <> 'INACTIVE') AND (" +
           "u.userId IN (SELECT tm.userId FROM TeamMember tm, Team t WHERE tm.teamId = t.teamId AND t.projectId = :projectId) OR " +
           "u.userId IN (SELECT p.projectManagerId FROM Project p WHERE p.projectId = :projectId) OR " +
           "u.userId IN (SELECT p.createdBy FROM Project p WHERE p.projectId = :projectId))")
    List<User> findEligibleMembersForProject(@Param("projectId") Long projectId);
}