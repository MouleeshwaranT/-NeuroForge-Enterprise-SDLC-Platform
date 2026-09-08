package com.example.demo.Controller;

import com.example.demo.model.Bug;
import com.example.demo.service.BugService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bugs")
public class BugController {
    private final BugService service;
    public BugController(BugService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Bug> create(@RequestBody Bug entity) { return ResponseEntity.ok(service.createBug(entity)); }
    @GetMapping
    public ResponseEntity<List<Bug>> getAll() { return ResponseEntity.ok(service.getAllBugs()); }
    @GetMapping("/{id}")
    public ResponseEntity<Bug> getById(@PathVariable Long id) { return service.getBugById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Bug> update(@PathVariable Long id, @RequestBody Bug entity) { return ResponseEntity.ok(service.updateBug(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteBug(id); return ResponseEntity.ok().build(); }
}
