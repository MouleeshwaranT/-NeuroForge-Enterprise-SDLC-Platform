package com.example.demo.repository;

import com.example.demo.model.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    
    List<TeamMember> findByTeamId(Long teamId);

    List<TeamMember> findByTeamIdIn(List<Long> teamIds);

    @Query("SELECT t.projectId FROM TeamMember tm JOIN Team t ON tm.teamId = t.teamId WHERE tm.userId = :userId")
    List<Long> findProjectIdsByUserId(@Param("userId") Long userId);

    @Query("SELECT t.projectId FROM TeamMember tm JOIN Team t ON tm.teamId = t.teamId WHERE tm.userId = :userId AND tm.memberId <> :excludeMemberId")
    List<Long> findProjectIdsByUserIdExcludingMember(@Param("userId") Long userId, @Param("excludeMemberId") Long excludeMemberId);

    @Query("SELECT tm FROM TeamMember tm JOIN Team t ON tm.teamId = t.teamId WHERE t.projectId IN :projectIds")
    List<TeamMember> findTeamMembersByProjectIds(@Param("projectIds") List<Long> projectIds);

    boolean existsByTeamIdAndUserId(Long teamId, Long userId);

    boolean existsByTeamIdAndUserIdAndMemberIdNot(Long teamId, Long userId, Long memberId);
}