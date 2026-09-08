package com.example.demo.repository;

import com.example.demo.model.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SystemLogRepository
        extends JpaRepository<SystemLog, Long> {
    @Query("SELECT sl FROM SystemLog sl LEFT JOIN Deployment d ON sl.deploymentId = d.deploymentId LEFT JOIN BuildPipeline bp ON d.pipelineId = bp.pipelineId LEFT JOIN Release r ON bp.releaseId = r.releaseId WHERE sl.deploymentId IS NULL OR r.projectId IN :projectIds")
    List<SystemLog> findByProjectIds(@Param("projectIds") List<Long> projectIds);
}