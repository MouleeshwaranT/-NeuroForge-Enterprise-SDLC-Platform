package com.example.demo.service;

import com.example.demo.model.SystemLog;
import com.example.demo.repository.ReleaseRepository;
import com.example.demo.repository.BuildPipelineRepository;
import com.example.demo.repository.ReleaseRepository;
import com.example.demo.repository.DeploymentRepository;
import com.example.demo.repository.ReleaseRepository;
import com.example.demo.repository.BuildPipelineRepository;
import com.example.demo.repository.ReleaseRepository;
import com.example.demo.repository.SystemLogRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SystemLogService {

    private final SystemLogRepository repository;
    private final ReleaseRepository releaseRepository;
    private final BuildPipelineRepository buildPipelineRepository;
    private final DeploymentRepository deploymentRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public SystemLogService(SystemLogRepository repository, ProjectScopeResolver projectScopeResolver, DeploymentRepository deploymentRepository, BuildPipelineRepository buildPipelineRepository, ReleaseRepository releaseRepository) {
        this.repository = repository;
    
        this.projectScopeResolver = projectScopeResolver;
        this.deploymentRepository = deploymentRepository;
        this.buildPipelineRepository = buildPipelineRepository;
        this.releaseRepository = releaseRepository;
    
    }

    public SystemLog create(SystemLog log) {

        if (log.getLogTime() == null) {
            log.setLogTime(OffsetDateTime.now());
        }

        return repository.save(log);
    }

    public SystemLog logEvent(String logLevel, String message) {
        return logEvent(null, logLevel, message);
    }

    public SystemLog logEvent(Long deploymentId, String logLevel, String message) {
        SystemLog log = new SystemLog();
        log.setDeploymentId(deploymentId);
        log.setLogLevel(logLevel != null ? logLevel : "INFO");
        log.setMessage(message);
        log.setLogTime(OffsetDateTime.now());
        return repository.save(log);
    }

    public List<SystemLog> getAll() {
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

    public Optional<SystemLog> getById(Long id) {
        SystemLog entity = repository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();

        if (entity.getDeploymentId() == null) {
            Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
            if (allowedPids.isPresent() && allowedPids.get().contains(-999L)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
            }
            return Optional.of(entity);
        }

        Long projectId = deploymentRepository.findById(entity.getDeploymentId())
                .flatMap(d -> buildPipelineRepository.findById(d.getPipelineId()))
                .flatMap(bp -> releaseRepository.findById(bp.getReleaseId()))
                .map(com.example.demo.model.Release::getProjectId)
                .orElse(null);
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    public SystemLog update(Long id, SystemLog updated) {

        SystemLog existing = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "System log not found: " + id));

        existing.setDeploymentId(updated.getDeploymentId());
        existing.setLogLevel(updated.getLogLevel());
        existing.setMessage(updated.getMessage());
        existing.setLogTime(updated.getLogTime());

        return repository.save(existing);
    }

    public void delete(Long id) {

        if (!repository.existsById(id)) {
            throw new RuntimeException(
                    "System log not found: " + id);
        }

        repository.deleteById(id);
    }
}