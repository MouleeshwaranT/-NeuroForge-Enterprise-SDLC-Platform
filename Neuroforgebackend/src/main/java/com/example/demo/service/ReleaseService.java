package com.example.demo.service;

import com.example.demo.model.Release;
import com.example.demo.repository.ReleaseRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.util.List;
import java.util.Optional;

@Service
public class ReleaseService {

    private final ReleaseRepository releaseRepository;
    private final ProjectScopeResolver projectScopeResolver;

    public ReleaseService(ReleaseRepository releaseRepository, ProjectScopeResolver projectScopeResolver) {
        this.releaseRepository = releaseRepository;
    
        this.projectScopeResolver = projectScopeResolver;
    
    }

    // CREATE
    public Release createRelease(Release release) {
        return releaseRepository.save(release);
    }

    // READ ALL
    public List<Release> getAllReleases() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return releaseRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return releaseRepository.findByProjectIdIn(pids);
    }

    // READ ONE
    public Optional<Release> getReleaseById(Long id) {
        Release entity = releaseRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE
    public Release updateRelease(Long id, Release updatedRelease) {

        Release existingRelease = releaseRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Release not found with id: " + id));

        existingRelease.setProjectId(updatedRelease.getProjectId());
        existingRelease.setReleaseName(updatedRelease.getReleaseName());
        existingRelease.setVersion(updatedRelease.getVersion());
        existingRelease.setReleaseDate(updatedRelease.getReleaseDate());
        existingRelease.setStatus(updatedRelease.getStatus());

        return releaseRepository.save(existingRelease);
    }

    // DELETE
    public void deleteRelease(Long id) {

        if (!releaseRepository.existsById(id)) {
            throw new RuntimeException(
                    "Release not found with id: " + id);
        }

        releaseRepository.deleteById(id);
    }
}