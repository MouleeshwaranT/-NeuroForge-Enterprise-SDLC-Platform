package com.example.demo.service;

import com.example.demo.dto.EmailResult;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${spring.mail.username:${MAIL_USERNAME:}}")
    private String fromEmail;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public EmailResult sendInvitationEmail(String toEmail, String fullName, String resetToken) {
        if (mailSender == null) {
            String errorMsg = "SMTP JavaMailSender is unconfigured on backend server.";
            logger.warn(">>> Email dispatch aborted for {}: JavaMailSender bean is null", toEmail);
            return new EmailResult(false, errorMsg);
        }

        try {
            CompletableFuture<EmailResult> future = CompletableFuture.supplyAsync(() ->
                doSendInvitationEmail(toEmail, fullName, resetToken)
            );
            return future.get(3500, TimeUnit.MILLISECONDS);
        } catch (TimeoutException te) {
            logger.warn(">>> SMTP Email dispatch timed out after 3.5s for {}", toEmail);
            return new EmailResult(false, "SMTP connection timed out. You can resend the invitation.");
        } catch (Exception e) {
            Throwable rootCause = e;
            while (rootCause.getCause() != null && rootCause.getCause() != rootCause) {
                rootCause = rootCause.getCause();
            }
            String rawError = rootCause.getMessage() != null ? rootCause.getMessage() : e.getMessage();
            logger.error(">>> SMTP Email dispatch execution error for recipient {}: {}", toEmail, rawError);
            return new EmailResult(false, rawError);
        }
    }

    private EmailResult doSendInvitationEmail(String toEmail, String fullName, String resetToken) {
        String setupUrl = frontendUrl + "/reset-password?token=" + resetToken;
        String subject = "Welcome to NeuroForge – Set Up Your Account";

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : toEmail;
            helper.setFrom(sender);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String htmlContent = "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1e1e2d; color: #ffffff; padding: 30px; border-radius: 10px;\">"
                    + "<h2 style=\"color: #3b82f6; text-align: center;\">Welcome to NeuroForge</h2>"
                    + "<p style=\"font-size: 16px;\">Hello <strong>" + (fullName != null ? fullName : "User") + "</strong>,</p>"
                    + "<p style=\"font-size: 14px; line-height: 1.6;\">You have been invited to NeuroForge.</p>"
                    + "<p style=\"font-size: 14px; line-height: 1.6;\">Please use the button below to set up your account and create your password.</p>"
                    + "<div style=\"text-align: center; margin: 30px 0;\">"
                    + "<a href=\"" + setupUrl + "\" style=\"background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block;\">Set Up Your Account</a>"
                    + "</div>"
                    + "<p style=\"font-size: 13px; color: #a0aec0;\">This invitation link expires after the configured 24-hour expiration period.</p>"
                    + "<p style=\"font-size: 13px; color: #a0aec0; border-top: 1px solid #2d3748; padding-top: 15px; margin-top: 30px;\">If you did not expect this invitation, please contact your administrator.</p>"
                    + "</div>";

            helper.setText(htmlContent, true);
            mailSender.send(mimeMessage);

            logger.info(">>> Invitation email successfully sent via SMTP to recipient: {}", toEmail);
            return new EmailResult(true, null);
        } catch (Exception e) {
            Throwable rootCause = e;
            while (rootCause.getCause() != null && rootCause.getCause() != rootCause) {
                rootCause = rootCause.getCause();
            }
            String rawError = rootCause.getMessage() != null ? rootCause.getMessage() : e.getMessage();
            if (rawError == null) rawError = e.getClass().getSimpleName();
            String sanitizedError = rawError.replaceAll("token=[a-zA-Z0-9-]+", "token=***");
            logger.error(">>> SMTP Email dispatch error for recipient {}: {}", toEmail, sanitizedError);
            return new EmailResult(false, sanitizedError);
        }
    }
}
