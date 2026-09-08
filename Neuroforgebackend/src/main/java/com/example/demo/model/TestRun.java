package com.example.demo.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "test_run")
public class TestRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "test_run_id")
    private Long testRunId;

    @Column(name = "testcase_id", nullable = false)
    private Long testcaseId;

    @Column(name = "executed_by", nullable = false)
    private Long executedBy;

    @Column(name = "execution_date")
    private OffsetDateTime executionDate;

    @Column(name = "result")
    private String result;

    // Default constructor
    public TestRun() {
    }

    // Parameterized constructor
    public TestRun(Long testRunId, Long testcaseId, Long executedBy,
                   OffsetDateTime executionDate, String result) {
        this.testRunId = testRunId;
        this.testcaseId = testcaseId;
        this.executedBy = executedBy;
        this.executionDate = executionDate;
        this.result = result;
    }

    public Long getTestRunId() {
        return testRunId;
    }

    public void setTestRunId(Long testRunId) {
        this.testRunId = testRunId;
    }

    public Long getTestcaseId() {
        return testcaseId;
    }

    public void setTestcaseId(Long testcaseId) {
        this.testcaseId = testcaseId;
    }

    public Long getExecutedBy() {
        return executedBy;
    }

    public void setExecutedBy(Long executedBy) {
        this.executedBy = executedBy;
    }

    public OffsetDateTime getExecutionDate() {
        return executionDate;
    }

    public void setExecutionDate(OffsetDateTime executionDate) {
        this.executionDate = executionDate;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }
}