package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "deployment")
public class Deployment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "deployment_id")
    private Long deploymentId;

    @Column(name = "pipeline_id", nullable = false)
    private Long pipelineId;

    @Column(name = "environment")
    private String environment;

    @Column(name = "deployed_by", nullable = false)
    private Long deployedBy;

    @Column(name = "status")
    private String status;

    public Deployment() {
    }

    public Deployment(Long deploymentId, Long pipelineId,
                      String environment, Long deployedBy,
                      String status) {
        this.deploymentId = deploymentId;
        this.pipelineId = pipelineId;
        this.environment = environment;
        this.deployedBy = deployedBy;
        this.status = status;
    }

    public Long getDeploymentId() {
        return deploymentId;
    }

    public void setDeploymentId(Long deploymentId) {
        this.deploymentId = deploymentId;
    }

    public Long getPipelineId() {
        return pipelineId;
    }

    public void setPipelineId(Long pipelineId) {
        this.pipelineId = pipelineId;
    }

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public Long getDeployedBy() {
        return deployedBy;
    }

    public void setDeployedBy(Long deployedBy) {
        this.deployedBy = deployedBy;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}