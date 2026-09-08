package com.example.demo.Controller;

import com.example.demo.dto.UserDTO;
import com.example.demo.dto.ProjectDTO;
import com.example.demo.model.Project;
import com.example.demo.service.ProjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService service;
    public ProjectController(ProjectService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<ProjectDTO> create(@RequestBody Project entity) { return ResponseEntity.ok(service.createProject(entity)); }
    @GetMapping
    public ResponseEntity<List<ProjectDTO>> getAll() { return ResponseEntity.ok(service.getAllProjects()); }
    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ProjectDTO> getById(@PathVariable Long id) { return service.getProjectById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @GetMapping("/{id:\\d+}/members")
    public ResponseEntity<List<UserDTO>> getMembers(@PathVariable Long id) { return ResponseEntity.ok(service.getProjectMembers(id)); }
    @PutMapping("/{id:\\d+}")
    public ResponseEntity<ProjectDTO> update(@PathVariable Long id, @RequestBody Project entity) { return ResponseEntity.ok(service.updateProject(id, entity)); }
    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteProject(id); return ResponseEntity.ok().build(); }
}
