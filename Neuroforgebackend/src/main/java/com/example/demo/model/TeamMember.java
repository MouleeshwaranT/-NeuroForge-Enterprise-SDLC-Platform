package com.example.demo.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "team_member")
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "role_in_team")
    private String roleInTeam;

    @Column(name = "joined_at")
    private OffsetDateTime joinedAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "team_member_role",
        joinColumns = @JoinColumn(name = "member_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @org.hibernate.annotations.OnDelete(action = org.hibernate.annotations.OnDeleteAction.CASCADE)
    private Set<TeamRole> roles = new HashSet<>();

    @Transient
    private Set<Long> roleIds = new HashSet<>();

    public TeamMember() {
    }

    public TeamMember(Long memberId, Long teamId, Long userId, String roleInTeam, OffsetDateTime joinedAt) {
        this.memberId = memberId;
        this.teamId = teamId;
        this.userId = userId;
        this.roleInTeam = roleInTeam;
        this.joinedAt = joinedAt;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public Long getTeamId() {
        return teamId;
    }

    public void setTeamId(Long teamId) {
        this.teamId = teamId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getRoleInTeam() {
        if (roles != null && !roles.isEmpty()) {
            return roles.stream().map(TeamRole::getRoleName).collect(Collectors.joining(", "));
        }
        return roleInTeam;
    }

    public void setRoleInTeam(String roleInTeam) {
        this.roleInTeam = roleInTeam;
    }

    public OffsetDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(OffsetDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }

    public Set<TeamRole> getRoles() {
        return roles;
    }

    public void setRoles(Set<TeamRole> roles) {
        this.roles = roles;
    }

    public Set<Long> getRoleIds() {
        if ((roleIds == null || roleIds.isEmpty()) && roles != null && !roles.isEmpty()) {
            return roles.stream().map(TeamRole::getRoleId).collect(Collectors.toSet());
        }
        return roleIds;
    }

    public void setRoleIds(Set<Long> roleIds) {
        this.roleIds = roleIds;
    }
}