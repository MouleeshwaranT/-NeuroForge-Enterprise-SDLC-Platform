package com.example.demo.model;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;

public class MetricsId implements Serializable {

    private Long projectId;
    private String metricName;
    private OffsetDateTime recordedAt;

    public MetricsId() {
    }

    public MetricsId(Long projectId,
                     String metricName,
                     OffsetDateTime recordedAt) {
        this.projectId = projectId;
        this.metricName = metricName;
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

    public OffsetDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(OffsetDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }

        if (!(o instanceof MetricsId)) {
            return false;
        }

        MetricsId that = (MetricsId) o;

        return Objects.equals(projectId, that.projectId)
                && Objects.equals(metricName, that.metricName)
                && Objects.equals(recordedAt, that.recordedAt);
    }

    @Override
    public int hashCode() {
        return Objects.hash(projectId, metricName, recordedAt);
    }
}