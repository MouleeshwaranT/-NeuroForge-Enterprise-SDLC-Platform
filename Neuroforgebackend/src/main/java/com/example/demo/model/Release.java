package com.example.demo.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "release")
public class Release {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "release_id")
    private Long releaseId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "release_name")
    private String releaseName;

    @Column(name = "version")
    private String version;

    @Column(name = "release_date")
    private LocalDate releaseDate;

    @Column(name = "status")
    private String status;

    public Release() {
    }

    public Release(Long releaseId,
                   Long projectId,
                   String releaseName,
                   String version,
                   LocalDate releaseDate,
                   String status) {

        this.releaseId = releaseId;
        this.projectId = projectId;
        this.releaseName = releaseName;
        this.version = version;
        this.releaseDate = releaseDate;
        this.status = status;
    }

    public Long getReleaseId() {
        return releaseId;
    }

    public void setReleaseId(Long releaseId) {
        this.releaseId = releaseId;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public String getReleaseName() {
        return releaseName;
    }

    public void setReleaseName(String releaseName) {
        this.releaseName = releaseName;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public LocalDate getReleaseDate() {
        return releaseDate;
    }

    public void setReleaseDate(LocalDate releaseDate) {
        this.releaseDate = releaseDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}