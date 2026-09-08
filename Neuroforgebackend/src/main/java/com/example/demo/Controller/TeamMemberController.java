package com.example.demo.Controller;

import com.example.demo.model.TeamMember;
import com.example.demo.service.TeamMemberService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/team-members")
public class TeamMemberController {
    private final TeamMemberService service;
    public TeamMemberController(TeamMemberService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<TeamMember> create(@RequestBody TeamMember entity) { return ResponseEntity.ok(service.createTeamMember(entity)); }
    @GetMapping
    public ResponseEntity<List<TeamMember>> getAll() { return ResponseEntity.ok(service.getAllTeamMembers()); }
    @GetMapping("/{id}")
    public ResponseEntity<TeamMember> getById(@PathVariable Long id) { return service.getTeamMemberById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
    @PutMapping("/{id}")
    public ResponseEntity<TeamMember> update(@PathVariable Long id, @RequestBody TeamMember entity) { return ResponseEntity.ok(service.updateTeamMember(id, entity)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteTeamMember(id); return ResponseEntity.ok().build(); }
}
