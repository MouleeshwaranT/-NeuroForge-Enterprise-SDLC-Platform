package com.example.demo.Controller;

import com.example.demo.model.TeamRole;
import com.example.demo.service.TeamRoleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/team-roles")
public class TeamRoleController {

    private final TeamRoleService service;

    public TeamRoleController(TeamRoleService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<TeamRole>> getRoles(@RequestParam(required = false) Long teamId) {
        return ResponseEntity.ok(service.getRolesForTeam(teamId));
    }

    @PostMapping
    public ResponseEntity<TeamRole> createRole(@RequestBody TeamRole entity) {
        verifyManagementPermission();
        return ResponseEntity.ok(service.createTeamRole(entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        verifyManagementPermission();
        service.deleteRole(id);
        return ResponseEntity.ok().build();
    }

    private void verifyManagementPermission() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null) {
            boolean isAuthorized = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ADMIN") ||
                a.getAuthority().equals("ROLE_ADMIN") ||
                a.getAuthority().equals("PROJECT_MANAGER") ||
                a.getAuthority().equals("ROLE_PROJECT_MANAGER")
            );
            if (!isAuthorized) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only authorized managers can create or modify team roles");
            }
        }
    }
}
