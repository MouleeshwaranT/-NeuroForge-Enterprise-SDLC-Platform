package com.example.demo.model;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "document")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "document_name")
    private String documentName;

    @Column(name = "file_path")
    private String filePath;

    @Column(name = "document_type")
    private String documentType;

    @Column(name = "upload_date")
    private OffsetDateTime uploadDate;

    // Default constructor
    public Document() {
    }

    // Parameterized constructor
    public Document(Long documentId, Long projectId, Long uploadedBy,
                    String documentName, String filePath,
                    String documentType, OffsetDateTime uploadDate) {

        this.documentId = documentId;
        this.projectId = projectId;
        this.uploadedBy = uploadedBy;
        this.documentName = documentName;
        this.filePath = filePath;
        this.documentType = documentType;
        this.uploadDate = uploadDate;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(Long uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getDocumentType() {
        return documentType;
    }

    public void setDocumentType(String documentType) {
        this.documentType = documentType;
    }

    public OffsetDateTime getUploadDate() {
        return uploadDate;
    }

    public void setUploadDate(OffsetDateTime uploadDate) {
        this.uploadDate = uploadDate;
    }
}