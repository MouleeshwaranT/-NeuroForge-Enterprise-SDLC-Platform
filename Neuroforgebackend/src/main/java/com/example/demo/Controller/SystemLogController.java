package com.example.demo.Controller;

import com.example.demo.model.SystemLog;
import com.example.demo.service.SystemLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/system-logs")
public class SystemLogController {
    private final SystemLogService service;
    public SystemLogController(SystemLogService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<SystemLog> create(@RequestBody SystemLog entity) { return ResponseEntity.ok(service.create(entity)); }
    @GetMapping
    public ResponseEntity<List<SystemLog>> getAll() { return ResponseEntity.ok(service.getAll()); }
    @GetMapping("/{id}")
    public ResponseEntity<SystemLog> getById(@PathVariable Long id) { return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<SystemLog> update(@PathVariable Long id, @RequestBody SystemLog entity) { return ResponseEntity.ok(service.update(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.delete(id); return ResponseEntity.ok().build(); }

}
