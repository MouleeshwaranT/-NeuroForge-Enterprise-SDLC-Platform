package com.example.demo.Controller;

import com.example.demo.model.Team;
import com.example.demo.service.TeamService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {
    private final TeamService service;
    public TeamController(TeamService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Team> create(@RequestBody Team entity) { return ResponseEntity.ok(service.createTeam(entity)); }
    @GetMapping
    public ResponseEntity<List<Team>> getAll() { return ResponseEntity.ok(service.getAllTeams()); }
    @GetMapping("/{id}")
    public ResponseEntity<Team> getById(@PathVariable Long id) { return service.getTeamById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<Team> update(@PathVariable Long id, @RequestBody Team entity) { return ResponseEntity.ok(service.updateTeam(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteTeam(id); return ResponseEntity.ok().build(); }
}
