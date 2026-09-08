package com.example.demo.Controller;

import com.example.demo.model.Release;
import com.example.demo.service.ReleaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/releases")
public class ReleaseController {
    private final ReleaseService service;
    public ReleaseController(ReleaseService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Release> create(@RequestBody Release entity) { return ResponseEntity.ok(service.createRelease(entity)); }
    @GetMapping
    public ResponseEntity<List<Release>> getAll() { return ResponseEntity.ok(service.getAllReleases()); }
    @GetMapping("/{id}")
    public ResponseEntity<Release> getById(@PathVariable Long id) { return service.getReleaseById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Release> update(@PathVariable Long id, @RequestBody Release entity) { return ResponseEntity.ok(service.updateRelease(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteRelease(id); return ResponseEntity.ok().build(); }

}
