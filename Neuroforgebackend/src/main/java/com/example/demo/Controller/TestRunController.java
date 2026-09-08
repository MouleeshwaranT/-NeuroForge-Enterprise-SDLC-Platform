package com.example.demo.Controller;

import com.example.demo.model.TestRun;
import com.example.demo.service.TestRunService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/test-runs")
public class TestRunController {
    private final TestRunService service;
    public TestRunController(TestRunService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<TestRun> create(@RequestBody TestRun entity) { return ResponseEntity.ok(service.createTestRun(entity)); }
    @GetMapping
    public ResponseEntity<List<TestRun>> getAll() { return ResponseEntity.ok(service.getAllTestRuns()); }
    @GetMapping("/{id}")
    public ResponseEntity<TestRun> getById(@PathVariable Long id) { return service.getTestRunById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<TestRun> update(@PathVariable Long id, @RequestBody TestRun entity) { return ResponseEntity.ok(service.updateTestRun(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteTestRun(id); return ResponseEntity.ok().build(); }
}
