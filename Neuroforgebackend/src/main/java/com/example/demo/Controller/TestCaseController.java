package com.example.demo.Controller;

import com.example.demo.model.TestCase;
import com.example.demo.service.TestCaseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/testcases")
public class TestCaseController {
    private final TestCaseService service;
    public TestCaseController(TestCaseService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<TestCase> create(@RequestBody TestCase entity) { return ResponseEntity.ok(service.createTestCase(entity)); }
    @GetMapping
    public ResponseEntity<List<TestCase>> getAll() { return ResponseEntity.ok(service.getAllTestCases()); }
    @GetMapping("/{id}")
    public ResponseEntity<TestCase> getById(@PathVariable Long id) { return service.getTestCaseById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<TestCase> update(@PathVariable Long id, @RequestBody TestCase entity) { return ResponseEntity.ok(service.updateTestCase(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteTestCase(id); return ResponseEntity.ok().build(); }
}
