package com.example.demo.Controller;

import com.example.demo.model.Requirement;
import com.example.demo.service.RequirementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/requirements")
public class RequirementController {
    private final RequirementService service;
    public RequirementController(RequirementService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Requirement> create(@RequestBody Requirement entity) { return ResponseEntity.ok(service.createRequirement(entity)); }
    @GetMapping
    public ResponseEntity<List<Requirement>> getAll() { return ResponseEntity.ok(service.getAllRequirements()); }
    @GetMapping("/{id}")
    public ResponseEntity<Requirement> getById(@PathVariable Long id) { return service.getRequirementById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Requirement> update(@PathVariable Long id, @RequestBody Requirement entity) { return ResponseEntity.ok(service.updateRequirement(id, entity)); }
    @PostMapping("/{id}/transition")
    public ResponseEntity<Requirement> transition(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String targetStatus = body.get("status");
        if (targetStatus == null || targetStatus.isBlank()) {
            targetStatus = body.get("targetStatus");
        }
        return ResponseEntity.ok(service.transitionRequirement(id, targetStatus));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteRequirement(id); return ResponseEntity.ok().build(); }
}
