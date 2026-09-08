package com.example.demo.Controller;

import com.example.demo.model.BuildPipeline;
import com.example.demo.service.BuildPipelineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/build-pipelines")
public class BuildPipelineController {
    private final BuildPipelineService service;
    public BuildPipelineController(BuildPipelineService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<BuildPipeline> create(@RequestBody BuildPipeline entity) { return ResponseEntity.ok(service.create(entity)); }
    @GetMapping
    public ResponseEntity<List<BuildPipeline>> getAll() { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/{id}")
    public ResponseEntity<BuildPipeline> getById(@PathVariable Long id) { return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<BuildPipeline> update(@PathVariable Long id, @RequestBody BuildPipeline entity) { return ResponseEntity.ok(service.update(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.ok().build(); }
}
