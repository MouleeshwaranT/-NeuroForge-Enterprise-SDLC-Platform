package com.example.demo.repository;

import com.example.demo.model.TeamRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRoleRepository extends JpaRepository<TeamRole, Long> {

    @Query("SELECT r FROM TeamRole r WHERE r.teamId IS NULL OR r.teamId = :teamId ORDER BY r.roleName ASC")
    List<TeamRole> findAvailableRolesForTeam(@Param("teamId") Long teamId);

    Optional<TeamRole> findByRoleNameIgnoreCaseAndTeamId(String roleName, Long teamId);

    Optional<TeamRole> findByRoleNameIgnoreCaseAndTeamIdIsNull(String roleName);

    boolean existsByRoleNameIgnoreCaseAndTeamId(String roleName, Long teamId);

    boolean existsByRoleNameIgnoreCaseAndTeamIdIsNull(String roleName);
}
