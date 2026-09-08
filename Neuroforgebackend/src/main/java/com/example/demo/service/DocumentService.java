package com.example.demo.service;

import com.example.demo.model.Document;
import com.example.demo.repository.DocumentRepository;
import com.example.demo.repository.ProjectRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.example.demo.security.ProjectScopeResolver;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.Collections;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final ProjectScopeResolver projectScopeResolver;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public DocumentService(DocumentRepository documentRepository,
                           ProjectRepository projectRepository,
                           UserRepository userRepository, ProjectScopeResolver projectScopeResolver) {
        this.documentRepository = documentRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    
        this.projectScopeResolver = projectScopeResolver;
    
    }

    private void validateRelationships(Document document) {
        if (document.getProjectId() != null && !projectRepository.existsById(document.getProjectId())) {
            throw new RuntimeException("Project not found with id: " + document.getProjectId());
        }
        if (document.getUploadedBy() != null && !userRepository.existsById(document.getUploadedBy())) {
            throw new RuntimeException("User not found with id: " + document.getUploadedBy());
        }
    }

    // CREATE
    public Document createDocument(Document document) {
        validateRelationships(document);

        if (document.getUploadDate() == null) {
            document.setUploadDate(OffsetDateTime.now());
        }

        return documentRepository.save(document);
    }

    // READ ALL
    public List<Document> getAllDocuments() {
        Optional<List<Long>> allowedPids = projectScopeResolver.getResolvedProjectIds();
        if (allowedPids.isEmpty()) {
            return documentRepository.findAll();
        }
        List<Long> pids = allowedPids.get();
        if (pids.isEmpty() || pids.contains(-999L)) {
            return Collections.emptyList();
        }
        return documentRepository.findByProjectIdIn(pids);
    }

    // READ ONE
    public Optional<Document> getDocumentById(Long id) {
        Document entity = documentRepository.findById(id).orElse(null);
        if (entity == null) return Optional.empty();
        
        Long projectId = entity.getProjectId();
        if (!projectScopeResolver.isProjectAllowed(projectId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied to this resource");
        }
        return Optional.of(entity);
    }

    // UPDATE
    public Document updateDocument(Long id, Document updatedDocument) {

        Document existingDocument = documentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Document not found with id: " + id));

        validateRelationships(updatedDocument);

        existingDocument.setProjectId(updatedDocument.getProjectId());
        existingDocument.setUploadedBy(updatedDocument.getUploadedBy());
        existingDocument.setDocumentName(updatedDocument.getDocumentName());
        existingDocument.setFilePath(updatedDocument.getFilePath());
        existingDocument.setDocumentType(updatedDocument.getDocumentType());

        return documentRepository.save(existingDocument);
    }

    // DELETE
    public void deleteDocument(Long id) {

        if (!documentRepository.existsById(id)) {
            throw new RuntimeException(
                    "Document not found with id: " + id);
        }

        documentRepository.deleteById(id);
    }
}