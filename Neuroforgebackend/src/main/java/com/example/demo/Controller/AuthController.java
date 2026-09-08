package com.example.demo.Controller;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtUtil;
import com.example.demo.service.SystemLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final SystemLogService systemLogService;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil,
                          SystemLogService systemLogService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.systemLogService = systemLogService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String fullName = request.get("fullName");
        String email = request.get("email");
        String password = request.get("password");
        String role = request.getOrDefault("role", "ROLE_USER");

        if (email == null || password == null || fullName == null ||
            email.trim().isEmpty() || password.trim().isEmpty() || fullName.trim().isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Full name, email, and password are required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        if (userRepository.findByEmail(email.trim()).isPresent()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Email is already registered");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
        }

        User newUser = new User();
        newUser.setFullName(fullName.trim());
        newUser.setEmail(email.trim());
        newUser.setPasswordHash(passwordEncoder.encode(password));
        newUser.setRole(role.startsWith("ROLE_") ? role : "ROLE_" + role);
        newUser.setStatus("ACTIVE");
        newUser.setCreatedAt(OffsetDateTime.now());

        userRepository.save(newUser);
        systemLogService.logEvent("INFO", "New user registered: " + newUser.getEmail() + " (" + newUser.getRole() + ")");

        String token = jwtUtil.generateToken(newUser.getEmail(), newUser.getRole());

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", "User registered successfully");
        responseBody.put("token", token);
        responseBody.put("userId", newUser.getUserId());
        responseBody.put("fullName", newUser.getFullName());
        responseBody.put("email", newUser.getEmail());
        responseBody.put("role", newUser.getRole());
        responseBody.put("status", newUser.getStatus());

        return ResponseEntity.status(HttpStatus.CREATED).body(responseBody);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email == null || password == null || email.trim().isEmpty() || password.trim().isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Invalid email or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            systemLogService.logEvent("WARN", "Failed login attempt for unknown email: " + email);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Invalid email or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        User user = userOpt.get();

        // Reject inactive or disabled users if status exists and is not active
        if (user.getStatus() != null && !user.getStatus().equalsIgnoreCase("ACTIVE")) {
            systemLogService.logEvent("WARN", "Blocked login attempt for suspended user: " + user.getEmail());
            Map<String, String> response = new HashMap<>();
            response.put("message", "User account is suspended or inactive");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        // Verify password hash with legacy fallback & on-the-fly migration to BCrypt
        boolean matches = false;
        String dbHash = user.getPasswordHash();
        boolean isBcrypt = dbHash != null && (dbHash.startsWith("$2a$") || dbHash.startsWith("$2b$") || dbHash.startsWith("$2y$"));

        if (isBcrypt) {
            matches = passwordEncoder.matches(password, dbHash);
        } else {
            // Legacy plain text check
            matches = password.equals(dbHash);
            if (matches) {
                // Migrate to BCrypt on-the-fly
                user.setPasswordHash(passwordEncoder.encode(password));
                userRepository.save(user);
            }
        }

        if (!matches) {
            systemLogService.logEvent("WARN", "Failed login attempt (incorrect password) for user: " + user.getEmail());
            Map<String, String> response = new HashMap<>();
            response.put("message", "Invalid email or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }

        // Generate token
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        systemLogService.logEvent("INFO", "User logged in successfully: " + user.getEmail());

        // Build safe response body
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("token", token);
        responseBody.put("userId", user.getUserId());
        responseBody.put("fullName", user.getFullName());
        responseBody.put("email", user.getEmail());
        responseBody.put("role", user.getRole());
        responseBody.put("status", user.getStatus());

        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Email address is required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            // Return generic success message for security to prevent account enumeration
            Map<String, String> response = new HashMap<>();
            response.put("message", "If an account exists with this email, a reset token has been generated.");
            return ResponseEntity.ok(response);
        }

        User user = userOpt.get();
        if (user.getStatus() != null && !user.getStatus().equalsIgnoreCase("ACTIVE")) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "User account is suspended or inactive");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }

        String resetToken = UUID.randomUUID().toString();
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(OffsetDateTime.now().plusMinutes(15));
        userRepository.save(user);

        systemLogService.logEvent("INFO", "Password reset requested for user account");

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Password reset token generated. Use this token within 15 minutes to reset your password.");
        response.put("resetToken", resetToken); // Return reset token so client UI can prefill/demonstrate password reset
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        if (token == null || token.trim().isEmpty() || newPassword == null || newPassword.trim().isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Reset token and new password are required");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        Optional<User> userOpt = userRepository.findByResetToken(token.trim());
        if (userOpt.isEmpty()) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Invalid or expired password reset token");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        User user = userOpt.get();
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(OffsetDateTime.now())) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password reset token has expired. Please request a new one.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        user.setStatus("ACTIVE");
        userRepository.save(user);

        systemLogService.logEvent("INFO", "Password reset completed for user account");

        Map<String, String> response = new HashMap<>();
        response.put("message", "Password has been successfully reset. You can now log in with your new password.");
        return ResponseEntity.ok(response);
    }
}

