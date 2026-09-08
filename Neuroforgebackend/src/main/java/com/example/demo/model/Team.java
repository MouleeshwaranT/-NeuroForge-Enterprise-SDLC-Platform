package com.example.demo.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "team")
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "team_id")
    private Long teamId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "team_name")
    private String teamName;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    // Default constructor
    public Team() {
    }

    // Parameterized constructor
    public Team(Long teamId, Long projectId, String teamName,
                OffsetDateTime createdAt) {
        this.teamId = teamId;
        this.projectId = projectId;
        this.teamName = teamName;
        this.createdAt = createdAt;
    }

    // Getters and Setters

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}