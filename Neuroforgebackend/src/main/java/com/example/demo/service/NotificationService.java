package com.example.demo.service;

import com.example.demo.model.Notification;
import com.example.demo.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {

    private final NotificationRepository repository;
    private final ProjectScopeResolver projectScopeResolver;

    public NotificationService(NotificationRepository repository, ProjectScopeResolver projectScopeResolver) {
        this.repository = repository;
    
        this.projectScopeResolver = projectScopeResolver;
    
    }

    public Notification create(Notification notification) {
        return repository.save(notification);
    }

    public List<Notification> getAll() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return repository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return repository.findByProjectIdIn(pids);
    }

    public Optional<Notification> getById(Long id) {
        Notification entity = repository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    public Notification update(Long id, Notification updated) {

        Notification existing = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Notification not found: " + id));

        existing.setUserId(updated.getUserId());
        existing.setProjectId(updated.getProjectId());
        existing.setTeamId(updated.getTeamId());

        return repository.save(existing);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException(
                    "Notification not found: " + id);
        }

        repository.deleteById(id);
    }
}