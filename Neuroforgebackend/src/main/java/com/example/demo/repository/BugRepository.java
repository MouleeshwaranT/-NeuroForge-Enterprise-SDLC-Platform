package com.example.demo.repository;

import com.example.demo.model.Bug;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BugRepository extends JpaRepository<Bug, Long> {
    @Query("SELECT DISTINCT b FROM Bug b LEFT JOIN Task t ON b.taskId = t.taskId LEFT JOIN TestCase tc ON b.testcaseId = tc.testcaseId LEFT JOIN Task t2 ON tc.taskId = t2.taskId WHERE t.projectId IN :projectIds OR t2.projectId IN :projectIds")
    List<Bug> findByProjectIds(@Param("projectIds") List<Long> projectIds);
}