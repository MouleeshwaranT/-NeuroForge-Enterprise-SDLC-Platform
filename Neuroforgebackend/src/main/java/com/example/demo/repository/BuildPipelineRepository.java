package com.example.demo.repository;

import com.example.demo.model.BuildPipeline;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface BuildPipelineRepository
        extends JpaRepository<BuildPipeline, Long> {
    @Query("SELECT bp FROM BuildPipeline bp JOIN Release r ON bp.releaseId = r.releaseId WHERE r.projectId IN :projectIds")
    List<BuildPipeline> findByProjectIds(@Param("projectIds") List<Long> projectIds);
}