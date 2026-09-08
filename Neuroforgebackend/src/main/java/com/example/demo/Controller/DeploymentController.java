package com.example.demo.Controller;

import com.example.demo.model.Deployment;
import com.example.demo.service.DeploymentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/deployments")
public class DeploymentController {
    private final DeploymentService service;
    public DeploymentController(DeploymentService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Deployment> create(@RequestBody Deployment entity) { return ResponseEntity.ok(service.create(entity)); }
    @GetMapping
    public ResponseEntity<List<Deployment>> getAll() { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/{id}")
    public ResponseEntity<Deployment> getById(@PathVariable Long id) { return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Deployment> update(@PathVariable Long id, @RequestBody Deployment entity) { return ResponseEntity.ok(service.update(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.ok().build(); }
}
