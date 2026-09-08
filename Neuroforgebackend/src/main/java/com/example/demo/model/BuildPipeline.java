package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "build_pipeline")
public class BuildPipeline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pipeline_id")
    private Long pipelineId;

    @Column(name = "release_id", nullable = false)
    private Long releaseId;

    @Column(name = "pipeline_name")
    private String pipelineName;

    @Column(name = "triggered_by", nullable = false)
    private Long triggeredBy;

    @Column(name = "status")
    private String status;

    public BuildPipeline() {
    }

    public BuildPipeline(Long pipelineId, Long releaseId,
                         String pipelineName, Long triggeredBy,
                         String status) {
        this.pipelineId = pipelineId;
        this.releaseId = releaseId;
        this.pipelineName = pipelineName;
        this.triggeredBy = triggeredBy;
        this.status = status;
    }

    public Long getPipelineId() {
        return pipelineId;
    }

    public void setPipelineId(Long pipelineId) {
        this.pipelineId = pipelineId;
    }

    public Long getReleaseId() {
        return releaseId;
    }

    public void setReleaseId(Long releaseId) {
        this.releaseId = releaseId;
    }

    public String getPipelineName() {
        return pipelineName;
    }

    public void setPipelineName(String pipelineName) {
        this.pipelineName = pipelineName;
    }

    public Long getTriggeredBy() {
        return triggeredBy;
    }

    public void setTriggeredBy(Long triggeredBy) {
        this.triggeredBy = triggeredBy;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}