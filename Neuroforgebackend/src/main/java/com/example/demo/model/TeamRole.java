package com.example.demo.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;

@Entity
@Table(name = "team_role")
public class TeamRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long roleId;

    @NotBlank(message = "Role name is required")
    @Column(name = "role_name", nullable = false)
    private String roleName;

    @Column(name = "team_id")
    private Long teamId;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public TeamRole() {
    }

    public TeamRole(Long roleId, String roleName, Long teamId, OffsetDateTime createdAt) {
        this.roleId = roleId;
        this.roleName = roleName;
        this.teamId = teamId;
        this.createdAt = createdAt;
    }

    public Long getRoleId() {
        return roleId;
    }

    public void setRoleId(Long roleId) {
        this.roleId = roleId;
    }

    public String getRoleName() {
        return roleName;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
