# Software Requirements Specification (SRS)
## NeuroForge Enterprise SDLC Management Platform

**Version:** 2.0.0  
**Status:** Approved  
**Author:** NeuroForge Engineering Team  
**Date:** September 2026  

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to define the comprehensive Software Requirements Specification (SRS) for the **NeuroForge Enterprise SDLC Management Platform**. NeuroForge is an end-to-end agile application lifecycle management (ALM) system designed for software product organizations, project managers, development teams, and quality assurance personnel.

### 1.2 Scope
NeuroForge facilitates complete governance over software development processes, including:
- Multi-project organization and team onboarding.
- User management with fine-grained Role-Based Access Control (RBAC).
- Requirement specification, content editing, and approval workflow (`DRAFT` $\rightarrow$ `APPROVED` $\rightarrow$ `IMPLEMENTED` $\rightarrow$ `VERIFIED`).
- Agile Sprint planning and lifecycle management (`PLANNED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED`).
- Task assignment, ownership control, and state machine transition validation (`TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `COMPLETED` / `BLOCKED` / `CHANGES_REQUESTED`).
- Quality assurance bug tracking linked directly to requirements and test cases.
- Real-time audit logging and system activity tracking.

---

## 2. User Roles & Permission Matrix

| Function / Capability | ROLE_ADMIN | ROLE_PROJECT_MANAGER | ROLE_DEVELOPER | ROLE_TESTER / QA | ROLE_USER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **System User Onboarding** | Full Access | No | No | No | No |
| **Project Creation & Deletion** | Full Access | Create/Manage Own | No | No | No |
| **Team Member Onboarding** | Full Access | Assigned Teams | No | No | No |
| **Requirement Creation** | Full Access | Full Access | Project Members | View Only | View Only |
| **Requirement Approval** | Full Access | Full Access | No | No | No |
| **Requirement Implementation** | Full Access | Full Access | Assigned Projects | No | No |
| **Requirement Verification** | Full Access | Full Access | No | Assigned Projects | No |
| **Sprint Management** | Full Access | Managed Projects | View Only | View Only | View Only |
| **Task Creation & Assignment** | Full Access | Managed Projects | No | No | No |
| **Task State Transition** | Full Access | Full Access | **Assigned Task Only** | **Assigned Task Only** | View Only |
| **Task Review / Approval** | Full Access | Full Access | No | No | No |
| **Task Deletion** | Full Access | Managed Projects | No | No | No |
| **Bug Tracking & Resolution** | Full Access | Full Access | Assigned Bugs | Log & Verify | View Only |

---

## 3. Detailed Functional Requirements

### 3.1 User & Team Onboarding
- **FR-1.1**: The system shall support user authentication via JWT tokens.
- **FR-1.2**: Admin users can onboard users with specific system roles (`ROLE_ADMIN`, `ROLE_PROJECT_MANAGER`, `ROLE_DEVELOPER`, `ROLE_TESTER`, `ROLE_USER`).
- **FR-1.3**: Team members can be assigned custom operational roles within project teams (e.g., Technical Lead, QA Engineer, Developer).
- **FR-1.4**: Member eligibility queries must return non-inactive project/team members cleanly without duplicate records.

### 3.2 Requirements Lifecycle Management
- **FR-2.1**: Requirements support four strict lifecycle stages: `DRAFT`, `APPROVED`, `IMPLEMENTED`, `VERIFIED`.
- **FR-2.2**: Stage transitions are strictly controlled:
  - `DRAFT` $\rightarrow$ `APPROVED` (Project Manager / Admin)
  - `APPROVED` $\rightarrow$ `IMPLEMENTED` (Developer / Authorized Project Member)
  - `IMPLEMENTED` $\rightarrow$ `VERIFIED` (Tester / QA)
- **FR-2.3**: If an `APPROVED` or `VERIFIED` requirement is edited, its lifecycle stage automatically resets to `DRAFT` for re-approval, and previous content is recorded in requirement audit history.

### 3.3 Sprint Management
- **FR-3.1**: Newly created sprints default automatically to status `PLANNED`.
- **FR-3.2**: Sprints progress sequentially: `PLANNED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED`.
- **FR-3.3**: End Date cannot precede Start Date.

### 3.4 Task Assignment & Workflow Control
- **FR-4.1**: Tasks belong to a Project and optionally link to a Sprint and Requirement.
- **FR-4.2**: Created By is automatically populated from the authenticated user context.
- **FR-4.3**: Tasks can only be assigned to eligible active members of the selected project/team.
- **FR-4.4**: State machine transitions are enforced:
  - `TODO` $\rightarrow$ `IN_PROGRESS`
  - `IN_PROGRESS` $\rightarrow$ `IN_REVIEW` or `BLOCKED`
  - `BLOCKED` $\rightarrow$ `IN_PROGRESS`
  - `IN_REVIEW` $\rightarrow$ `COMPLETED` (Approved by PM/Admin) or `CHANGES_REQUESTED` (Rejected by PM/Admin)
  - `CHANGES_REQUESTED` $\rightarrow$ `IN_PROGRESS`
- **FR-4.5**: Non-manager team members can ONLY transition tasks assigned to them and cannot modify structural project metadata.

---

## 4. Non-Functional Requirements

### 4.1 Security
- Password hashing using BCrypt (`PasswordEncoder`).
- Stateless authentication with JWT headers (`Authorization: Bearer <token>`).
- API authorization checks on both controller/service layers to reject unauthorized modifications with HTTP 403 Forbidden.

### 4.2 Performance & Scalability
- Optimized JPA query execution using indexed primary keys and subqueries.
- UI build optimization via Vite and bundle code-splitting.

### 4.3 Reliability & Auditability
- Audit logging of all critical system events via `SystemLogService`.
- Transactional integrity on database updates.
