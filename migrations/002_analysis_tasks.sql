-- Create scout schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS scout;

-- Create analysis_tasks table
CREATE TABLE IF NOT EXISTS scout.analysis_tasks (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL,
    profile_id BIGINT NOT NULL,
    source VARCHAR(255) NOT NULL,
    should_save BOOLEAN NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    is_committed BOOLEAN NOT NULL DEFAULT FALSE,
    committed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);