-- Ensure system_log.deployment_id permits NULL values for non-deployment system audit events
ALTER TABLE IF EXISTS system_log ALTER COLUMN deployment_id DROP NOT NULL;

-- Ensure foreign key constraints on team_member_role cascade on delete
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

