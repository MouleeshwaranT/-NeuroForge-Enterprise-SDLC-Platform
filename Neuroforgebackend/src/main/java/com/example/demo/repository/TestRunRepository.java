package com.example.demo.repository;

import com.example.demo.model.TestRun;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TestRunRepository extends JpaRepository<TestRun, Long> {
    @Query("SELECT tr FROM TestRun tr JOIN TestCase tc ON tr.testcaseId = tc.testcaseId JOIN Task t ON tc.taskId = t.taskId WHERE t.projectId IN :projectIds")
    List<TestRun> findByProjectIds(@Param("projectIds") List<Long> projectIds);
}