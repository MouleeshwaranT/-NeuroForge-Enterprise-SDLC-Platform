package com.example.demo.service;

import com.example.demo.model.Metrics;
import com.example.demo.model.MetricsId;
import com.example.demo.repository.MetricsRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MetricsService {

    private final MetricsRepository metricsRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public MetricsService(MetricsRepository metricsRepository, ProjectScopeResolver projectScopeResolver) {
        this.metricsRepository = metricsRepository;
    
        this.projectScopeResolver = projectScopeResolver;
    
    }

    // CREATE
    public Metrics createMetric(Metrics metrics) {

        if (metrics.getRecordedAt() == null) {
            metrics.setRecordedAt(OffsetDateTime.now());
        }

        return metricsRepository.save(metrics);
    }

    // READ ALL
    public List<Metrics> getAllMetrics() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return metricsRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return metricsRepository.findByProjectIdIn(pids);
    }

    // READ BY PROJECT
    public List<Metrics> getMetricsByProject(Long projectId) {
        return metricsRepository.findByProjectId(projectId);
    }

    // READ ONE
    public Optional<Metrics> getMetricById(
            Long projectId,
            String metricName,
            OffsetDateTime recordedAt) {

        MetricsId id = new MetricsId(
                projectId,
                metricName,
                recordedAt
        );

        return metricsRepository.findById(id);
    }

    // UPDATE
    public Metrics updateMetric(
            Long projectId,
            String metricName,
            OffsetDateTime recordedAt,
            Metrics updatedMetric) {

        MetricsId id = new MetricsId(
                projectId,
                metricName,
                recordedAt
        );

        Metrics existingMetric = metricsRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Metric not found"
                        ));

        existingMetric.setMetricValue(
                updatedMetric.getMetricValue()
        );

        return metricsRepository.save(existingMetric);
    }

    // DELETE
    public void deleteMetric(
            Long projectId,
            String metricName,
            OffsetDateTime recordedAt) {

        MetricsId id = new MetricsId(
                projectId,
                metricName,
                recordedAt
        );

        if (!metricsRepository.existsById(id)) {
            throw new RuntimeException(
                    "Metric not found"
            );
        }

        metricsRepository.deleteById(id);
    }
}