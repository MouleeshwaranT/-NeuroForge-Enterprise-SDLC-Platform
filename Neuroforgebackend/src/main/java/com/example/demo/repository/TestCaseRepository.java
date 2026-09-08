package com.example.demo.repository;

import com.example.demo.model.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TestCaseRepository extends JpaRepository<TestCase, Long> {
    @Query("SELECT tc FROM TestCase tc JOIN Task t ON tc.taskId = t.taskId WHERE t.projectId IN :projectIds")
    List<TestCase> findByProjectIds(@Param("projectIds") List<Long> projectIds);
}