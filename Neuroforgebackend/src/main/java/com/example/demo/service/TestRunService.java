package com.example.demo.service;

import com.example.demo.model.TestRun;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.TestCaseRepository;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.TestRunRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TestRunService {

    private final TestRunRepository testRunRepository;
    private final ProjectScopeResolver projectScopeResolver;
    private final TestCaseRepository testCaseRepository;
    private final TaskRepository taskRepository;

    public TestRunService(TestRunRepository testRunRepository, ProjectScopeResolver projectScopeResolver, TestCaseRepository testCaseRepository, TaskRepository taskRepository) {
        this.testRunRepository = testRunRepository;
    
        this.projectScopeResolver = projectScopeResolver;
        this.testCaseRepository = testCaseRepository;
        this.taskRepository = taskRepository;
    
    }

    // CREATE
    public TestRun createTestRun(TestRun testRun) {

        if (testRun.getExecutionDate() == null) {
            testRun.setExecutionDate(OffsetDateTime.now());
        }

        return testRunRepository.save(testRun);
    }

    // READ ALL
    public List<TestRun> getAllTestRuns() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return testRunRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return testRunRepository.findByProjectIds(pids);
    }

    // READ ONE
    public Optional<TestRun> getTestRunById(Long id) {
        TestRun entity = testRunRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = testCaseRepository.findById(entity.getTestcaseId()).flatMap(tc -> taskRepository.findById(tc.getTaskId())).map(com.example.demo.model.Task::getProjectId).orElse(null);
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE
    public TestRun updateTestRun(Long id, TestRun updatedTestRun) {

        TestRun existingTestRun = testRunRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Test run not found with id: " + id));

        existingTestRun.setTestcaseId(updatedTestRun.getTestcaseId());
        existingTestRun.setExecutedBy(updatedTestRun.getExecutedBy());
        existingTestRun.setResult(updatedTestRun.getResult());

        return testRunRepository.save(existingTestRun);
    }

    // DELETE
    public void deleteTestRun(Long id) {

        if (!testRunRepository.existsById(id)) {
            throw new RuntimeException(
                    "Test run not found with id: " + id);
        }

        testRunRepository.deleteById(id);
    }
}