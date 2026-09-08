package com.example.demo.Controller;

import com.example.demo.dto.UserDTO;
import com.example.demo.dto.UserOnboardingResult;
import com.example.demo.model.User;
import com.example.demo.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;
    public UserController(UserService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<UserOnboardingResult> create(@RequestBody User entity) { 
        return ResponseEntity.ok(service.createUser(entity)); 
    }

    @PostMapping("/{id}/resend-invitation")
    public ResponseEntity<UserOnboardingResult> resendInvitation(@PathVariable Long id) {
        return ResponseEntity.ok(service.resendInvitation(id));
    }

    @GetMapping
    public ResponseEntity<List<User>> getAll() { return ResponseEntity.ok(service.getAllUsers()); }

    @GetMapping("/project-managers")
    public ResponseEntity<List<UserDTO>> getProjectManagers() { return ResponseEntity.ok(service.getEligibleProjectManagers()); }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<User> getById(@PathVariable Long id) { return service.getUserById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<User> update(@PathVariable Long id, @RequestBody User entity) { return ResponseEntity.ok(service.updateUser(id, entity)); }

    @PutMapping("/{id:\\d+}/status")
    public ResponseEntity<User> updateStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload) {
        String status = payload.get("status");
        return ResponseEntity.ok(service.updateUserStatus(id, status));
    }

    @DeleteMapping("/{id:\\d+}")
    public ResponseEntity<Void> delete(@PathVariable Long id) { service.deleteUser(id); return ResponseEntity.ok().build(); }
}
