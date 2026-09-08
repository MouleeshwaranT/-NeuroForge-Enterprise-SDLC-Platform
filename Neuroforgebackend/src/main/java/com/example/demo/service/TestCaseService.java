package com.example.demo.service;

import com.example.demo.model.TestCase;
import com.example.demo.repository.TestCaseRepository;
import com.example.demo.repository.TaskRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.util.List;
import java.util.Optional;

@Service
public class TestCaseService {

    private final TestCaseRepository testCaseRepository;
    private final ProjectScopeResolver projectScopeResolver;
    private final TaskRepository taskRepository;

    public TestCaseService(TestCaseRepository testCaseRepository, TaskRepository taskRepository, ProjectScopeResolver projectScopeResolver) {
        this.testCaseRepository = testCaseRepository;
        this.taskRepository = taskRepository;
    
        this.projectScopeResolver = projectScopeResolver;
    
    }

    // CREATE
    public TestCase createTestCase(TestCase testCase) {
        if (testCase.getTaskId() != null && !taskRepository.existsById(testCase.getTaskId())) {
            throw new RuntimeException("Task not found with id: " + testCase.getTaskId());
        }
        return testCaseRepository.save(testCase);
    }

    // READ ALL
    public List<TestCase> getAllTestCases() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return testCaseRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return testCaseRepository.findByProjectIds(pids);
    }

    // READ ONE
    public Optional<TestCase> getTestCaseById(Long id) {
        TestCase entity = testCaseRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = taskRepository.findById(entity.getTaskId()).map(com.example.demo.model.Task::getProjectId).orElse(null);
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE
    public TestCase updateTestCase(Long id, TestCase testCase) {

        TestCase existingTestCase =
                testCaseRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException("Test case not found with id: " + id));

        if (testCase.getTaskId() != null && !taskRepository.existsById(testCase.getTaskId())) {
            throw new RuntimeException("Task not found with id: " + testCase.getTaskId());
        }

        existingTestCase.setTaskId(testCase.getTaskId());
        existingTestCase.setExpectedResult(testCase.getExpectedResult());
        existingTestCase.setActualResult(testCase.getActualResult());
        existingTestCase.setStatus(testCase.getStatus());

        return testCaseRepository.save(existingTestCase);
    }

    // DELETE
    public void deleteTestCase(Long id) {

        if (!testCaseRepository.existsById(id)) {
            throw new RuntimeException("Test case not found with id: " + id);
        }

        testCaseRepository.deleteById(id);
    }
}