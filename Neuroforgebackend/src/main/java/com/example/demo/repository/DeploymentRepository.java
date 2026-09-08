package com.example.demo.repository;

import com.example.demo.model.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DeploymentRepository
        extends JpaRepository<Deployment, Long> {
    @Query("SELECT d FROM Deployment d JOIN BuildPipeline bp ON d.pipelineId = bp.pipelineId JOIN Release r ON bp.releaseId = r.releaseId WHERE r.projectId IN :projectIds")
    List<Deployment> findByProjectIds(@Param("projectIds") List<Long> projectIds);
}