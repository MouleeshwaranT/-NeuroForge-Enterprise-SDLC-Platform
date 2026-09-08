package com.example.demo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "test_case")
public class TestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "testcase_id")
    private Long testcaseId;

    @NotNull(message = "Task ID is required")
    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "expected_result")
    private String expectedResult;

    @Column(name = "actual_result")
    private String actualResult;

    @Column(name = "status")
    private String status;

    public TestCase() {
    }

    public TestCase(Long testcaseId, Long taskId,
                    String expectedResult,
                    String actualResult,
                    String status) {
        this.testcaseId = testcaseId;
        this.taskId = taskId;
        this.expectedResult = expectedResult;
        this.actualResult = actualResult;
        this.status = status;
    }

    public Long getTestcaseId() {
        return testcaseId;
    }

    public void setTestcaseId(Long testcaseId) {
        this.testcaseId = testcaseId;
    }

    public Long getTaskId() {
        return taskId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public String getExpectedResult() {
        return expectedResult;
    }

    public void setExpectedResult(String expectedResult) {
        this.expectedResult = expectedResult;
    }

    public String getActualResult() {
        return actualResult;
    }

    public void setActualResult(String actualResult) {
        this.actualResult = actualResult;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}