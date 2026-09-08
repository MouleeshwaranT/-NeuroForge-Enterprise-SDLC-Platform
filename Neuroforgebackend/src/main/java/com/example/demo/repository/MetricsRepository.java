package com.example.demo.repository;

import com.example.demo.model.Metrics;
import com.example.demo.model.MetricsId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MetricsRepository
        extends JpaRepository<Metrics, MetricsId> {

    List<Metrics> findByProjectId(Long projectId);
    List<Metrics> findByProjectIdIn(List<Long> projectIds);
}