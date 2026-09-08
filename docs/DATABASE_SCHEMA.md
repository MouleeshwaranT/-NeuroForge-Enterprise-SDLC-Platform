# Database Schema & DDL Documentation

## Overview
The **NeuroForge Platform** utilizes a relational database model optimized for PostgreSQL (Supabase) and H2 in-memory databases. Foreign keys, CASCADE triggers, and constraints ensure data integrity across projects, teams, requirements, sprints, tasks, and system logs.

---

## DDL Schema Definitions (`schema.sql`)

```sql
-- Ensure system_log.deployment_id permits NULL values for non-deployment system audit events
ALTER TABLE IF EXISTS system_log ALTER COLUMN deployment_id DROP NOT NULL;

-- Foreign key constraints on team_member_role cascade on delete
ALTER TABLE IF EXISTS team_member_role DROP CONSTRAINT IF EXISTS fk5e6b98xn8al7jsir523ekb5ey;
ALTER TABLE IF EXISTS team_member_role DROP CONSTRAINT IF EXISTS fk_team_member_role_member;
ALTER TABLE IF EXISTS team_member_role ADD CONSTRAINT fk_team_member_role_member FOREIGN KEY (member_id) REFERENCES team_member(member_id) ON DELETE CASCADE;

-- Ensure Project table has project_manager_id column
ALTER TABLE IF EXISTS Project ADD COLUMN IF NOT EXISTS project_manager_id BIGINT;

-- Ensure unique constraint on team_member(team_id, user_id)
ALTER TABLE IF EXISTS team_member DROP CONSTRAINT IF EXISTS uq_team_member_team_user;
ALTER TABLE IF EXISTS team_member ADD CONSTRAINT uq_team_member_team_user UNIQUE (team_id, user_id);

-- Ensure Requirement table has audit & previous_content columns
ALTER TABLE IF EXISTS Requirement ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS Requirement ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE IF EXISTS Requirement ADD COLUMN IF NOT EXISTS previous_content TEXT;

-- Ensure Task table has start_date, updated_at, updated_by, and comments columns
ALTER TABLE IF EXISTS task ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE IF EXISTS task ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS task ADD COLUMN IF NOT EXISTS updated_by BIGINT;
ALTER TABLE IF EXISTS task ADD COLUMN IF NOT EXISTS comments TEXT;
```

---

## Primary Database Tables

### 1. `USER`
Stores authenticated application users and their system roles.
- `user_id` (BIGINT, PK, AUTO_INCREMENT)
- `email` (VARCHAR 255, UNIQUE, NOT NULL)
- `full_name` (VARCHAR 255)
- `password_hash` (VARCHAR 255)
- `role` (VARCHAR 50) - e.g., `ROLE_ADMIN`, `ROLE_PROJECT_MANAGER`, `ROLE_DEVELOPER`, `ROLE_TESTER`, `ROLE_USER`
- `status` (VARCHAR 50) - e.g., `ACTIVE`, `INVITED`, `INACTIVE`
- `created_at` (TIMESTAMP WITH TIME ZONE)

### 2. `PROJECT`
Stores software development projects.
- `project_id` (BIGINT, PK, AUTO_INCREMENT)
- `name` (VARCHAR 255, NOT NULL)
- `description` (TEXT)
- `status` (VARCHAR 50) - `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`
- `start_date` (DATE)
- `end_date` (DATE)
- `project_manager_id` (BIGINT, FK -> USER.user_id)
- `created_by` (BIGINT, FK -> USER.user_id)

### 3. `TEAM` & `TEAM_MEMBER`
Manages project team assignments and member roles.
- `team_id` (BIGINT, PK)
- `project_id` (BIGINT, FK -> PROJECT.project_id)
- `team_name` (VARCHAR 255)
- `member_id` (BIGINT, PK)
- `user_id` (BIGINT, FK -> USER.user_id)
- `role_in_team` (VARCHAR 255)

### 4. `REQUIREMENT`
Tracks business and technical requirements through a 4-stage lifecycle.
- `requirement_id` (BIGINT, PK)
- `project_id` (BIGINT, FK -> PROJECT.project_id)
- `title` (VARCHAR 255)
- `description` (TEXT)
- `priority` (VARCHAR 50) - `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `lifecycle_stage` (VARCHAR 50) - `DRAFT`, `APPROVED`, `IMPLEMENTED`, `VERIFIED`
- `previous_content` (TEXT) - Audit log for changes made post-approval
- `updated_by` (VARCHAR 255)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 5. `SPRINT`
Schedules agile development iterations.
- `sprint_id` (BIGINT, PK)
- `project_id` (BIGINT, FK -> PROJECT.project_id)
- `sprint_name` (VARCHAR 255)
- `sprint_goal` (TEXT)
- `status` (VARCHAR 50) - `PLANNED`, `ACTIVE`, `COMPLETED`
- `start_date` (DATE)
- `end_date` (DATE)

### 6. `TASK`
Manages individual work items and state transitions.
- `task_id` (BIGINT, PK)
- `project_id` (BIGINT, FK -> PROJECT.project_id)
- `sprint_id` (BIGINT, FK -> SPRINT.sprint_id, NULLABLE)
- `requirement_id` (BIGINT, FK -> REQUIREMENT.requirement_id, NULLABLE)
- `assigned_to` (BIGINT, FK -> USER.user_id, NULLABLE)
- `created_by` (BIGINT, FK -> USER.user_id)
- `title` (VARCHAR 255, NOT NULL)
- `description` (TEXT)
- `priority` (VARCHAR 50)
- `status` (VARCHAR 50) - `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `COMPLETED`, `BLOCKED`, `CHANGES_REQUESTED`
- `start_date` (DATE)
- `due_date` (DATE)
- `comments` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `updated_by` (BIGINT, FK -> USER.user_id)

### 7. `SYSTEM_LOG`
Audits system activity events across the application.
- `log_id` (BIGINT, PK)
- `log_level` (VARCHAR 50) - `INFO`, `WARN`, `ERROR`
- `log_time` (TIMESTAMP WITH TIME ZONE)
- `message` (TEXT)
- `deployment_id` (BIGINT, NULLABLE)
