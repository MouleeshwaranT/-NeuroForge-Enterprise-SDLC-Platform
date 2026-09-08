package com.example.demo.Controller;

import com.example.demo.model.Metrics;
import com.example.demo.service.MetricsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {
    private final MetricsService service;
    public MetricsController(MetricsService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Metrics> create(@RequestBody Metrics entity) { return ResponseEntity.ok(service.createMetric(entity)); }
    @GetMapping
    public ResponseEntity<List<Metrics>> getAll() { return ResponseEntity.ok(service.getAllMetrics()); }
    @GetMapping("/project/projectId")
    public ResponseEntity<List<Metrics>> getMetricsByProject(@PathVariable Long projectId) { return ResponseEntity.ok(service.getMetricsByProject(projectId)); }
}
