package com.example.demo.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "system_log")
public class SystemLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    @Column(name = "deployment_id", nullable = true)
    private Long deploymentId;

    @Column(name = "log_level")
    private String logLevel;

    @Column(name = "message")
    private String message;

    @Column(name = "log_time")
    private OffsetDateTime logTime;

    public SystemLog() {
    }

    public SystemLog(Long logId, Long deploymentId,
                     String logLevel, String message,
                     OffsetDateTime logTime) {
        this.logId = logId;
        this.deploymentId = deploymentId;
        this.logLevel = logLevel;
        this.message = message;
        this.logTime = logTime;
    }

    public Long getLogId() {
        return logId;
    }

    public void setLogId(Long logId) {
        this.logId = logId;
    }

    public Long getDeploymentId() {
        return deploymentId;
    }

    public void setDeploymentId(Long deploymentId) {
        this.deploymentId = deploymentId;
    }

    public String getLogLevel() {
        return logLevel;
    }

    public void setLogLevel(String logLevel) {
        this.logLevel = logLevel;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public OffsetDateTime getLogTime() {
        return logTime;
    }

    public void setLogTime(OffsetDateTime logTime) {
        this.logTime = logTime;
    }
}