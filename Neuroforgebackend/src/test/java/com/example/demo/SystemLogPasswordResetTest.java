package com.example.demo;

import com.example.demo.Controller.AuthController;
import com.example.demo.model.*;
import com.example.demo.repository.*;
import com.example.demo.service.SystemLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class SystemLogPasswordResetTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ReleaseRepository releaseRepository;

    @Autowired
    private BuildPipelineRepository buildPipelineRepository;

    @Autowired
    private DeploymentRepository deploymentRepository;

    @Autowired
    private SystemLogRepository systemLogRepository;

    @Autowired
    private SystemLogService systemLogService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;

    @BeforeEach
    void setUp() {
        systemLogRepository.deleteAll();
        deploymentRepository.deleteAll();
        buildPipelineRepository.deleteAll();
        releaseRepository.deleteAll();
        projectRepository.deleteAll();
        userRepository.deleteAll();

        testUser = new User();
        testUser.setFullName("Test Audit User");
        testUser.setEmail("audituser@example.com");
        testUser.setPasswordHash(passwordEncoder.encode("OldPassword123!"));
        testUser.setRole("ROLE_USER");
        testUser.setStatus("ACTIVE");
        testUser.setCreatedAt(OffsetDateTime.now());
        userRepository.save(testUser);
    }

    @Test
    void testCompletePasswordResetFlowAndSystemLogIntegrity() {
        // 1. User requests password reset via AuthController
        Map<String, String> forgotReq = new HashMap<>();
        forgotReq.put("email", "audituser@example.com");

        ResponseEntity<?> forgotResp = authController.forgotPassword(forgotReq);
        assertEquals(HttpStatus.OK, forgotResp.getStatusCode());

        Map<?, ?> forgotBody = (Map<?, ?>) forgotResp.getBody();
        assertNotNull(forgotBody);
        assertTrue(forgotBody.containsKey("resetToken"));

        // Verify SystemLog created with deployment_id = NULL
        List<SystemLog> logsAfterForgot = systemLogRepository.findAll();
        assertFalse(logsAfterForgot.isEmpty(), "SystemLog must be saved for password reset request");

        SystemLog forgotLog = logsAfterForgot.stream()
                .filter(l -> l.getMessage().contains("Password reset requested"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Expected audit log for password reset request"));

        assertNull(forgotLog.getDeploymentId(), "SystemLog deployment_id must be NULL for non-deployment event");
        assertEquals("INFO", forgotLog.getLogLevel());
        assertNotNull(forgotLog.getLogTime());

        // Assert secret tokens and passwords are NOT logged
        assertFalse(forgotLog.getMessage().contains("OldPassword123!"), "Log must not contain user password");

        // 2. Fetch reset token from user entity
        User updatedUser = userRepository.findByEmail("audituser@example.com").orElseThrow();
        String resetToken = updatedUser.getResetToken();
        assertNotNull(resetToken, "Reset token must be generated");
        assertFalse(forgotLog.getMessage().contains(resetToken), "Log must not contain reset token");

        // 3. Perform password reset with valid token
        Map<String, String> resetReq = new HashMap<>();
        resetReq.put("token", resetToken);
        resetReq.put("newPassword", "NewPassword123!");

        ResponseEntity<?> resetResp = authController.resetPassword(resetReq);
        assertEquals(HttpStatus.OK, resetResp.getStatusCode());

        // Verify password updated in DB
        User resetUser = userRepository.findByEmail("audituser@example.com").orElseThrow();
        assertTrue(passwordEncoder.matches("NewPassword123!", resetUser.getPasswordHash()));
        assertNull(resetUser.getResetToken());

        // Verify reset completion SystemLog created with deployment_id = NULL
        List<SystemLog> logsAfterReset = systemLogRepository.findAll();
        SystemLog resetLog = logsAfterReset.stream()
                .filter(l -> l.getMessage().contains("Password reset completed"))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Expected audit log for password reset completion"));

        assertNull(resetLog.getDeploymentId(), "SystemLog deployment_id must be NULL for password reset completion");
        assertFalse(resetLog.getMessage().contains("NewPassword123!"), "Log must not contain new password");
        assertFalse(resetLog.getMessage().contains(resetToken), "Log must not contain reset token");

        // 4. Verify deployment-related logs still store valid deployment_id
        Project project = new Project();
        project.setName("Audit Test Project");
        project.setDescription("Test project for deployment logging");
        project.setStatus("ACTIVE");
        project.setCreatedBy(testUser.getUserId());
        project = projectRepository.save(project);

        Release release = new Release();
        release.setProjectId(project.getProjectId());
        release.setReleaseName("v1.0.0");
        release.setVersion("1.0.0");
        release.setReleaseDate(LocalDate.now());
        release.setStatus("APPROVED");
        release = releaseRepository.save(release);

        BuildPipeline pipeline = new BuildPipeline();
        pipeline.setReleaseId(release.getReleaseId());
        pipeline.setPipelineName("CI/CD Pipeline");
        pipeline.setTriggeredBy(testUser.getUserId());
        pipeline.setStatus("SUCCESS");
        pipeline = buildPipelineRepository.save(pipeline);

        Deployment deployment = new Deployment();
        deployment.setPipelineId(pipeline.getPipelineId());
        deployment.setEnvironment("PRODUCTION");
        deployment.setDeployedBy(testUser.getUserId());
        deployment.setStatus("SUCCESS");
        deployment = deploymentRepository.save(deployment);

        SystemLog deployLog = systemLogService.logEvent(deployment.getDeploymentId(), "INFO", "Deployment completed successfully");
        assertNotNull(deployLog.getLogId());
        assertEquals(deployment.getDeploymentId(), deployLog.getDeploymentId(), "Deployment log must retain valid deployment_id");

        // 5. Verify invalid reset token handling
        Map<String, String> invalidReq = new HashMap<>();
        invalidReq.put("token", "invalid-token-uuid-999");
        invalidReq.put("newPassword", "NewPassword123!");

        ResponseEntity<?> invalidResp = authController.resetPassword(invalidReq);
        assertEquals(HttpStatus.BAD_REQUEST, invalidResp.getStatusCode());
    }
}
