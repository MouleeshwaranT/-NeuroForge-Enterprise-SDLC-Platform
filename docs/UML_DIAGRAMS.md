# NeuroForge UML Architecture & Design Specifications

This document contains comprehensive UML diagrams and architectural specifications for the **NeuroForge Enterprise SDLC Platform**. All diagrams are formatted using standard GitHub-Flavored Markdown Mermaid syntax.

---

## 1. System Component & Layer Architecture

```mermaid
graph TD
    Client[React SPA Frontend - Vite + Bootstrap]
    
    subgraph Security Layer
        Filter[JwtRequestFilter]
        AuthManager[AuthenticationManager]
        ScopeResolver[ProjectScopeResolver]
    end

    subgraph REST Controllers
        AuthCtrl[AuthController]
        UserCtrl[UserController]
        ProjCtrl[ProjectController]
        TeamCtrl[TeamController]
        ReqCtrl[RequirementController]
        SprintCtrl[SprintController]
        TaskCtrl[TaskController]
        BugCtrl[BugController]
    end

    subgraph Service Layer
        AuthSvc[AuthService]
        UserSvc[UserService]
        ProjSvc[ProjectService]
        TeamSvc[TeamService]
        ReqSvc[RequirementService]
        SprintSvc[SprintService]
        TaskSvc[TaskService]
        BugSvc[BugService]
        LogSvc[SystemLogService]
    end

    subgraph Persistence Layer JPA Repositories
        UserRepo[UserRepository]
        ProjRepo[ProjectRepository]
        TeamRepo[TeamRepository]
        TeamMemberRepo[TeamMemberRepository]
        ReqRepo[RequirementRepository]
        SprintRepo[SprintRepository]
        TaskRepo[TaskRepository]
        BugRepo[BugRepository]
    end

    Database[(Database - Supabase PostgreSQL / H2)]

    Client --> AuthCtrl
    Client --> UserCtrl
    Client --> ProjCtrl
    Client --> TeamCtrl
    Client --> ReqCtrl
    Client --> SprintCtrl
    Client --> TaskCtrl
    Client --> BugCtrl

    AuthCtrl --> AuthSvc
    UserCtrl --> UserSvc
    ProjCtrl --> ProjSvc
    TeamCtrl --> TeamSvc
    ReqCtrl --> ReqSvc
    SprintCtrl --> SprintSvc
    TaskCtrl --> TaskSvc
    BugCtrl --> BugSvc

    ProjSvc --> ScopeResolver
    TaskSvc --> ScopeResolver
    TaskSvc --> LogSvc
    ReqSvc --> LogSvc

    UserSvc --> UserRepo
    ProjSvc --> ProjRepo
    ProjSvc --> TeamRepo
    ProjSvc --> TeamMemberRepo
    ReqSvc --> ReqRepo
    SprintSvc --> SprintRepo
    TaskSvc --> TaskRepo
    BugSvc --> BugRepo

    UserRepo --> Database
    ProjRepo --> Database
    TeamRepo --> Database
    TeamMemberRepo --> Database
    ReqRepo --> Database
    SprintRepo --> Database
    TaskRepo --> Database
    BugRepo --> Database
```

---

## 2. System Use Case Diagram

```mermaid
usecaseDiagram
    actor Admin as "System Administrator"
    actor PM as "Project Manager"
    actor Dev as "Developer"
    actor Tester as "QA / Tester"

    package "NeuroForge SDLC Management System" {
        usecase UC1 as "Manage System Users & Onboarding"
        usecase UC2 as "Create & Manage Projects"
        usecase UC3 as "Onboard Team Members & Assign Roles"
        usecase UC4 as "Create & Approve Requirements"
        usecase UC5 as "Mark Requirement Implemented"
        usecase UC6 as "Verify Requirement Implementation"
        usecase UC7 as "Plan & Activate Sprints"
        usecase UC8 as "Create & Assign Tasks"
        usecase UC9 as "Execute & Transition Assigned Tasks"
        usecase UC10 as "Review & Complete Tasks"
        usecase UC11 as "Report & Verify Bugs"
    }

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC7
    Admin --> UC8
    Admin --> UC10

    PM --> UC2
    PM --> UC3
    PM --> UC4
    PM --> UC7
    PM --> UC8
    PM --> UC10

    Dev --> UC5
    Dev --> UC9
    Dev --> UC11

    Tester --> UC6
    Tester --> UC9
    Tester --> UC11
```

---

## 3. Domain Entity Class Diagram

```mermaid
classDiagram
    class User {
        +Long userId
        +String fullName
        +String email
        +String passwordHash
        +String role
        +String status
        +OffsetDateTime createdAt
    }

    class Project {
        +Long projectId
        +String name
        +String description
        +String status
        +LocalDate startDate
        +LocalDate endDate
        +Long projectManagerId
        +Long createdBy
    }

    class Team {
        +Long teamId
        +Long projectId
        +String teamName
        +OffsetDateTime createdAt
    }

    class TeamMember {
        +Long memberId
        +Long teamId
        +Long userId
        +String roleInTeam
        +OffsetDateTime joinedAt
    }

    class Requirement {
        +Long requirementId
        +Long projectId
        +String title
        +String description
        +String priority
        +String lifecycleStage
        +String updatedBy
        +OffsetDateTime updatedAt
    }

    class Sprint {
        +Long sprintId
        +Long projectId
        +String sprintName
        +String sprintGoal
        +String status
        +LocalDate startDate
        +LocalDate endDate
    }

    class Task {
        +Long taskId
        +Long projectId
        +Long sprintId
        +Long requirementId
        +Long assignedTo
        +Long createdBy
        +String title
        +String description
        +String priority
        +String status
        +LocalDate startDate
        +LocalDate dueDate
        +String comments
    }

    class Bug {
        +Long bugId
        +Long projectId
        +Long taskId
        +Long testcaseId
        +Long assignedTo
        +Long loggedBy
        +String title
        +String severity
        +String status
    }

    Project "1" -- "*" Team : contains
    Team "1" -- "*" TeamMember : includes
    User "1" -- "*" TeamMember : assigned_to
    Project "1" -- "*" Requirement : tracks
    Project "1" -- "*" Sprint : organizes
    Project "1" -- "*" Task : manages
    Sprint "1" -- "*" Task : schedules
    Requirement "1" -- "*" Task : fulfills
    User "1" -- "*" Task : assigned_to
    Task "1" -- "*" Bug : generates
```

---

## 4. Sequence Diagram: Task Lifecycle & Assignment Execution

```mermaid
sequenceDiagram
    autonumber
    actor PM as Project Manager / Admin
    actor Dev as Assigned Developer
    participant Ctrl as TaskController
    participant Svc as TaskService
    participant Scope as ProjectScopeResolver
    participant DB as TaskRepository (DB)

    Note over PM, DB: 1. Task Creation & Assignment
    PM ->> Ctrl: POST /api/tasks (projectId, assignedTo: Dev, status: TODO)
    Ctrl ->> Svc: createTask(task)
    Svc ->> Scope: isProjectAllowed(projectId)
    Scope -->> Svc: Allowed
    Svc ->> Svc: validateRelationships(task)
    Svc ->> DB: save(task)
    DB -->> Svc: Saved Task #101
    Svc -->> Ctrl: Task Response
    Ctrl -->> PM: 200 OK (Task #101 Created)

    Note over Dev, DB: 2. Developer Starts Task Execution
    Dev ->> Ctrl: PUT /api/tasks/101 (status: IN_PROGRESS)
    Ctrl ->> Svc: updateTask(101, task)
    Svc ->> Svc: Verify ownership (currentUser == task.assignedTo)
    Svc ->> Svc: validateStatusTransition("TODO" -> "IN_PROGRESS")
    Svc ->> DB: save(task)
    DB -->> Svc: Updated Task #101
    Svc -->> Ctrl: Task Response
    Ctrl -->> Dev: 200 OK (Status: IN_PROGRESS)

    Note over Dev, DB: 3. Developer Submits for Review
    Dev ->> Ctrl: PUT /api/tasks/101 (status: IN_REVIEW)
    Ctrl ->> Svc: updateTask(101, task)
    Svc ->> Svc: validateStatusTransition("IN_PROGRESS" -> "IN_REVIEW")
    Svc ->> DB: save(task)
    DB -->> Svc: Updated Task #101
    Ctrl -->> Dev: 200 OK (Status: IN_REVIEW)

    Note over PM, DB: 4. Manager Reviews & Completes Task
    PM ->> Ctrl: PUT /api/tasks/101 (status: COMPLETED)
    Ctrl ->> Svc: updateTask(101, task)
    Svc ->> Svc: validateStatusTransition("IN_REVIEW" -> "COMPLETED")
    Svc ->> DB: save(task)
    DB -->> Svc: Updated Task #101
    Ctrl -->> PM: 200 OK (Status: COMPLETED)
```

---

## 5. Sequence Diagram: Requirement Edit & Reset Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant Ctrl as RequirementController
    participant Svc as RequirementService
    participant Repo as RequirementRepository

    Note over Dev, Repo: Requirement is currently APPROVED
    Dev ->> Ctrl: PUT /api/requirements/42 (updated content)
    Ctrl ->> Svc: updateRequirement(42, requirementDetails)
    Svc ->> Repo: findById(42)
    Repo -->> Svc: Existing Requirement (Stage: APPROVED)
    
    Svc ->> Svc: Detect material change on APPROVED content
    Svc ->> Svc: Save previous_content into audit column
    Svc ->> Svc: Automatically reset lifecycleStage = "DRAFT"
    
    Svc ->> Repo: save(updatedRequirement)
    Repo -->> Svc: Saved Requirement #42 (Stage: DRAFT)
    Svc -->> Ctrl: Requirement DTO
    Ctrl -->> Dev: 200 OK (Content Updated, Reset to DRAFT)
```

---

## 6. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    "USER" ||--o{ TEAM_MEMBER : "participates_in"
    "USER" ||--o{ PROJECT : "manages"
    PROJECT ||--o{ TEAM : "contains"
    TEAM ||--o{ TEAM_MEMBER : "includes"
    TEAM_MEMBER ||--o{ TEAM_MEMBER_ROLE : "has"
    TEAM_ROLE ||--o{ TEAM_MEMBER_ROLE : "assigned"
    PROJECT ||--o{ REQUIREMENT : "defines"
    PROJECT ||--o{ SPRINT : "schedules"
    PROJECT ||--o{ TASK : "tracks"
    SPRINT ||--o{ TASK : "groups"
    REQUIREMENT ||--o{ TASK : "fulfills"
    "USER" ||--o{ TASK : "assigned_to"
    PROJECT ||--o{ BUG : "contains"
    TASK ||--o{ BUG : "generates"

    "USER" {
        bigint user_id PK
        varchar email UK
        varchar full_name
        varchar password_hash
        varchar role
        varchar status
        timestamp created_at
    }

    PROJECT {
        bigint project_id PK
        varchar name
        text description
        varchar status
        date start_date
        date end_date
        bigint project_manager_id FK
        bigint created_by FK
    }

    TEAM {
        bigint team_id PK
        bigint project_id FK
        varchar team_name
        timestamp created_at
    }

    TEAM_MEMBER {
        bigint member_id PK
        bigint team_id FK
        bigint user_id FK
        varchar role_in_team
        timestamp joined_at
    }

    REQUIREMENT {
        bigint requirement_id PK
        bigint project_id FK
        varchar title
        text description
        varchar priority
        varchar lifecycle_stage
        text previous_content
        varchar updated_by
        timestamp updated_at
    }

    SPRINT {
        bigint sprint_id PK
        bigint project_id FK
        varchar sprint_name
        text sprint_goal
        varchar status
        date start_date
        date end_date
    }

    TASK {
        bigint task_id PK
        bigint project_id FK
        bigint sprint_id FK
        bigint requirement_id FK
        bigint assigned_to FK
        bigint created_by FK
        varchar title
        text description
        varchar priority
        varchar status
        date start_date
        date due_date
        text comments
        timestamp created_at
        timestamp updated_at
    }

    BUG {
        bigint bug_id PK
        bigint project_id FK
        bigint task_id FK
        bigint testcase_id FK
        bigint assigned_to FK
        bigint logged_by FK
        varchar title
        varchar severity
        varchar status
    }
```
