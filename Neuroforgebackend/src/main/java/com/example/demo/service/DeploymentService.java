package com.example.demo.service;

import com.example.demo.model.Deployment;
import com.example.demo.repository.ReleaseRepository;
import com.example.demo.repository.BuildPipelineRepository;
import com.example.demo.repository.DeploymentRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.util.List;
import java.util.Optional;

@Service
public class DeploymentService {

    private final DeploymentRepository repository;
    private final ReleaseRepository releaseRepository;
    private final BuildPipelineRepository buildPipelineRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public DeploymentService(DeploymentRepository repository, ProjectScopeResolver projectScopeResolver, BuildPipelineRepository buildPipelineRepository, ReleaseRepository releaseRepository) {
        this.repository = repository;
        this.projectScopeResolver = projectScopeResolver;
        this.buildPipelineRepository = buildPipelineRepository;
        this.releaseRepository = releaseRepository;
    }

    private Long resolveProjectId(Deployment deployment) {
        if (deployment != null && deployment.getPipelineId() != null) {
            return buildPipelineRepository.findById(deployment.getPipelineId())
                    .flatMap(bp -> releaseRepository.findById(bp.getReleaseId()))
                    .map(com.example.demo.model.Release::getProjectId)
                    .orElse(null);
        }
        return null;
    }

    private void validateProductionEnvironmentPermission(String environment) {
        if (environment != null && environment.toUpperCase().contains("PROD")) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                boolean isAuthorized = auth.getAuthorities().stream().anyMatch(a ->
                        a.getAuthority().equalsIgnoreCase("ROLE_ADMIN") ||
                        a.getAuthority().equalsIgnoreCase("ADMIN") ||
                        a.getAuthority().equalsIgnoreCase("ROLE_PROJECT_MANAGER") ||
                        a.getAuthority().equalsIgnoreCase("PROJECT_MANAGER")
                );
                if (!isAuthorized) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only Project Managers or Admins are authorized to trigger production deployments");
                }
            }
        }
    }

    public Deployment create(Deployment deployment) {
        Long pid = resolveProjectId(deployment);
        if (pid != null && !projectScopeResolver.isProjectAllowed(pid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to trigger deployments for this project");
        }
        validateProductionEnvironmentPermission(deployment.getEnvironment());
        return repository.save(deployment);
    }

    public List<Deployment> getAll() {
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

    public Optional<Deployment> getById(Long id) {
        Deployment entity = repository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = resolveProjectId(entity);
        if (projectId != null && !projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    public Deployment update(Long id, Deployment updated) {
        Deployment existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment not found with id: " + id));

        Long projectId = resolveProjectId(existing);
        if (projectId != null && !projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to modify deployments in this project");
        }
        validateProductionEnvironmentPermission(updated.getEnvironment());

        existing.setPipelineId(updated.getPipelineId());
        existing.setEnvironment(updated.getEnvironment());
        existing.setDeployedBy(updated.getDeployedBy());
        existing.setStatus(updated.getStatus());

        return repository.save(existing);
    }

    public void delete(Long id) {
        Deployment existing = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Deployment not found with id: " + id));

        Long projectId = resolveProjectId(existing);
        if (projectId != null && !projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to delete deployments in this project");
        }

        repository.deleteById(id);
    }
}