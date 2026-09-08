package com.example.demo.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "metrics")
@IdClass(MetricsId.class)
public class Metrics {

    @Id
    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Id
    @Column(name = "metric_name", nullable = false)
    private String metricName;

    @Id
    @Column(name = "recorded_at", nullable = false)
    private OffsetDateTime recordedAt;

    @Column(name = "metric_value")
    private BigDecimal metricValue;

    public Metrics() {
    }

    public Metrics(Long projectId,
                   String metricName,
                   BigDecimal metricValue,
                   OffsetDateTime recordedAt) {

        this.projectId = projectId;
        this.metricName = metricName;
        this.metricValue = metricValue;
        this.recordedAt = recordedAt;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public String getMetricName() {
        return metricName;
    }

    public void setMetricName(String metricName) {
        this.metricName = metricName;
    }

    public BigDecimal getMetricValue() {
        return metricValue;
    }

    public void setMetricValue(BigDecimal metricValue) {
        this.metricValue = metricValue;
    }

    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(OffsetDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}