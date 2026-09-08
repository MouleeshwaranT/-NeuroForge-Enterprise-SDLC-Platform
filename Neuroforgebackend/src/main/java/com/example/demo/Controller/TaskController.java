package com.example.demo.Controller;

import com.example.demo.model.Task;
import com.example.demo.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService service;
    public TaskController(TaskService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Task> create(@RequestBody Task entity) { return ResponseEntity.ok(service.createTask(entity)); }
    @GetMapping
    public ResponseEntity<List<Task>> getAll() { return ResponseEntity.ok(service.getAllTasks()); }
    @GetMapping("/{id}")
    public ResponseEntity<Task> getById(@PathVariable Long id) { return service.getTaskById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable Long id, @RequestBody Task entity) { return ResponseEntity.ok(service.updateTask(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteTask(id); return ResponseEntity.ok().build(); }
}
