package com.example.demo.Controller;

import com.example.demo.model.Sprint;
import com.example.demo.service.SprintService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {
    private final SprintService service;
    public SprintController(SprintService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Sprint> create(@RequestBody Sprint entity) { return ResponseEntity.ok(service.createSprint(entity)); }
    @GetMapping
    public ResponseEntity<List<Sprint>> getAll() { return ResponseEntity.ok(service.getAllSprints()); }
    @GetMapping("/{id}")
    public ResponseEntity<Sprint> getById(@PathVariable Long id) { return service.getSprintById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Sprint> update(@PathVariable Long id, @RequestBody Sprint entity) { return ResponseEntity.ok(service.updateSprint(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteSprint(id); return ResponseEntity.ok().build(); }
}
