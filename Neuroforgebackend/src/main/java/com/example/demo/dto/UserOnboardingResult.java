package com.example.demo.dto;

import com.example.demo.model.User;

public class UserOnboardingResult {
    private User user;
    private boolean emailSent;
    private String emailError;

    public UserOnboardingResult() {
    }

    public UserOnboardingResult(User user, boolean emailSent, String emailError) {
        this.user = user;
        this.emailSent = emailSent;
        this.emailError = emailError;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public boolean isEmailSent() {
        return emailSent;
    }

    public void setEmailSent(boolean emailSent) {
        this.emailSent = emailSent;
    }

    public String getEmailError() {
        return emailError;
    }

    public void setEmailError(String emailError) {
        this.emailError = emailError;
    }
}
