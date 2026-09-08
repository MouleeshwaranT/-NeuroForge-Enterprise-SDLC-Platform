package com.example.demo.service;

import com.example.demo.model.BuildPipeline;
import com.example.demo.repository.ReleaseRepository;
import com.example.demo.repository.BuildPipelineRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.util.List;
import java.util.Optional;

@Service
public class BuildPipelineService {

    private final BuildPipelineRepository repository;
    private final ReleaseRepository releaseRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public BuildPipelineService(BuildPipelineRepository repository, ProjectScopeResolver projectScopeResolver, ReleaseRepository releaseRepository) {
        this.repository = repository;
    
        this.projectScopeResolver = projectScopeResolver;
        this.releaseRepository = releaseRepository;
    
    }

    public BuildPipeline create(BuildPipeline pipeline) {
        return repository.save(pipeline);
    }

    public List<BuildPipeline> getAll() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return repository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return repository.findByProjectIds(pids);
    }

    public Optional<BuildPipeline> getById(Long id) {
        BuildPipeline entity = repository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = releaseRepository.findById(entity.getReleaseId()).map(com.example.demo.model.Release::getProjectId).orElse(null);
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    public BuildPipeline update(Long id, BuildPipeline updated) {

        BuildPipeline existing = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Pipeline not found with id: " + id));

        existing.setReleaseId(updated.getReleaseId());
        existing.setPipelineName(updated.getPipelineName());
        existing.setTriggeredBy(updated.getTriggeredBy());
        existing.setStatus(updated.getStatus());

        return repository.save(existing);
    }

    public void delete(Long id) {

        if (!repository.existsById(id)) {
            throw new RuntimeException(
                    "Pipeline not found with id: " + id);
        }

        repository.deleteById(id);
    }
}