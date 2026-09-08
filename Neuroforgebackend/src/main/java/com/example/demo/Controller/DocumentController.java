package com.example.demo.Controller;

import com.example.demo.model.Document;
import com.example.demo.service.DocumentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    private final DocumentService service;
    public DocumentController(DocumentService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Document> create(@RequestBody Document entity) { return ResponseEntity.ok(service.createDocument(entity)); }
    @GetMapping
    public ResponseEntity<List<Document>> getAll() { return ResponseEntity.ok(service.getAllDocuments()); }
    @GetMapping("/{id}")
    public ResponseEntity<Document> getById(@PathVariable Long id) { return service.getDocumentById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Document> update(@PathVariable Long id, @RequestBody Document entity) { return ResponseEntity.ok(service.updateDocument(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteDocument(id); return ResponseEntity.ok().build(); }
}
