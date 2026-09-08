package com.example.demo;

import com.example.demo.Controller.AuthController;
import com.example.demo.dto.UserOnboardingResult;
import com.example.demo.model.SystemLog;
import com.example.demo.model.User;
import com.example.demo.repository.SystemLogRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class UserOnboardingIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthController authController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SystemLogRepository systemLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        systemLogRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void testCompleteEnterpriseUserOnboardingFlow() {
        // 1. Admin creates / invites new user without supplying a password
        User newUser = new User();
        newUser.setFullName("Jane Developer");
        newUser.setEmail("jane.dev@neuroforge.com");
        newUser.setPhone("+1-555-0199");
        newUser.setRole("ROLE_DEVELOPER");
        newUser.setStatus("INVITED");

        UserOnboardingResult onboardingResult = userService.createUser(newUser);
        assertNotNull(onboardingResult);
        User createdUser = onboardingResult.getUser();
        assertNotNull(createdUser.getUserId());
        assertEquals("jane.dev@neuroforge.com", createdUser.getEmail());
        assertEquals("ROLE_DEVELOPER", createdUser.getRole());
        assertEquals("INVITED", createdUser.getStatus());
        String initialToken = createdUser.getResetToken();
        assertNotNull(initialToken, "Invitation token must be generated");
        assertNotNull(createdUser.getResetTokenExpiry());
        assertTrue(createdUser.getResetTokenExpiry().isAfter(OffsetDateTime.now()));

        // Verify SystemLog created with deployment_id = NULL
        List<SystemLog> logs = systemLogRepository.findAll();
        assertFalse(logs.isEmpty(), "SystemLog must be saved for user onboarding");
        SystemLog inviteLog = logs.stream()
                .filter(l -> l.getMessage().contains("User invitation created"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Expected audit log for user invitation"));
        assertNull(inviteLog.getDeploymentId(), "SystemLog deployment_id must be NULL for user creation");

        // 2. Resend Invitation Flow
        UserOnboardingResult resendResult = userService.resendInvitation(createdUser.getUserId());
        assertNotNull(resendResult);
        User resentUser = resendResult.getUser();
        assertNotNull(resentUser.getResetToken());
        assertNotEquals(initialToken, resentUser.getResetToken(), "Resending invitation must issue a fresh token");

        // 3. Verify Duplicate Email Registration Handling
        User duplicateUser = new User();
        duplicateUser.setFullName("Jane Copycat");
        duplicateUser.setEmail("jane.dev@neuroforge.com");
        duplicateUser.setRole("ROLE_USER");

        ResponseStatusException conflictEx = assertThrows(
                ResponseStatusException.class,
                () -> userService.createUser(duplicateUser),
                "Duplicate email creation must throw ResponseStatusException CONFLICT"
        );
        assertEquals(HttpStatus.CONFLICT, conflictEx.getStatusCode());

        // 4. User receives token and completes Password Setup via AuthController
        String invitationToken = resentUser.getResetToken();

        Map<String, String> resetReq = new HashMap<>();
        resetReq.put("token", invitationToken);
        resetReq.put("newPassword", "EnterpriseSecurePass123!");

        ResponseEntity<?> resetResp = authController.resetPassword(resetReq);
        assertEquals(HttpStatus.OK, resetResp.getStatusCode());

        // 5. Verify Account Activation & Token Invalidation in DB
        User activatedUser = userRepository.findByEmail("jane.dev@neuroforge.com").orElseThrow();
        assertEquals("ACTIVE", activatedUser.getStatus(), "Account status must transition to ACTIVE");
        assertNull(activatedUser.getResetToken(), "Invitation token must be invalidated");
        assertNull(activatedUser.getResetTokenExpiry());
        assertTrue(passwordEncoder.matches("EnterpriseSecurePass123!", activatedUser.getPasswordHash()), "Password must be securely hashed with BCrypt");

        // 6. Verify Newly Onboarded User Can Log In
        Map<String, String> loginReq = new HashMap<>();
        loginReq.put("email", "jane.dev@neuroforge.com");
        loginReq.put("password", "EnterpriseSecurePass123!");

        ResponseEntity<?> loginResp = authController.login(loginReq);
        assertEquals(HttpStatus.OK, loginResp.getStatusCode());
        Map<?, ?> loginBody = (Map<?, ?>) loginResp.getBody();
        assertNotNull(loginBody);
        assertTrue(loginBody.containsKey("token"));
        assertEquals("jane.dev@neuroforge.com", loginBody.get("email"));
        assertEquals("ROLE_DEVELOPER", loginBody.get("role"));
        assertEquals("ACTIVE", loginBody.get("status"));

        // 7. Verify Used Token Cannot Be Reused
        ResponseEntity<?> reuseResp = authController.resetPassword(resetReq);
        assertEquals(HttpStatus.BAD_REQUEST, reuseResp.getStatusCode());
    }
}
