package com.example.demo.repository;


import com.example.demo.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByProjectIdIn(List<Long> projectIds);

    @org.springframework.data.jpa.repository.Query("SELECT p.projectId FROM Project p WHERE p.projectManagerId = :managerId OR (p.projectManagerId IS NULL AND p.createdBy = :managerId)")
    List<Long> findProjectIdsByManagerId(@org.springframework.data.repository.query.Param("managerId") Long managerId);
}