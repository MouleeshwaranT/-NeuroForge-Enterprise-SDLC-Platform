package com.example.demo.service;

import com.example.demo.model.ChatMessage;
import com.example.demo.repository.ChatMessageRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.util.List;
import java.util.Optional;

@Service
public class ChatMessageService {

    private final ChatMessageRepository repository;
    private final ProjectScopeResolver projectScopeResolver;

    public ChatMessageService(ChatMessageRepository repository, ProjectScopeResolver projectScopeResolver) {
        this.repository = repository;
    
        this.projectScopeResolver = projectScopeResolver;
    
    }

    public ChatMessage create(ChatMessage message) {
        return repository.save(message);
    }

    public List<ChatMessage> getAll() {
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

    public Optional<ChatMessage> getById(Long id) {
        ChatMessage entity = repository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    public ChatMessage update(Long id, ChatMessage updated) {

        ChatMessage existing = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Chat message not found: " + id));

        existing.setProjectId(updated.getProjectId());
        existing.setSenderId(updated.getSenderId());
        existing.setMessage(updated.getMessage());
        existing.setTeamId(updated.getTeamId());

        return repository.save(existing);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException(
                    "Chat message not found: " + id);
        }

        repository.deleteById(id);
    }
}