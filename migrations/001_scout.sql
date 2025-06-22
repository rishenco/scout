-- +goose Up

-- Create scout schema
CREATE SCHEMA IF NOT EXISTS scout;

-- Create profiles tables
CREATE TABLE IF NOT EXISTS scout.profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (name)
);

-- Create profile settings table
CREATE TABLE IF NOT EXISTS scout.profile_settings (
    profile_id BIGINT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    source VARCHAR(255) NULL,
    relevancy_filter VARCHAR(8192) NOT NULL,
    extracted_properties JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE NULLS NOT DISTINCT (profile_id, source)
);

-- Create detections table
CREATE TABLE IF NOT EXISTS scout.detections (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    profile_id BIGINT NOT NULL,
    settings_version INT NOT NULL,
    is_relevant BOOLEAN NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create detection tags table
CREATE TABLE IF NOT EXISTS scout.detection_tags (
    detection_id BIGINT NOT NULL,
    relevancy_detected_correctly BOOLEAN NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (detection_id)
);

-- Create analysis tasks table
CREATE TABLE IF NOT EXISTS scout.analysis_tasks (
    id BIGSERIAL PRIMARY KEY,
    "type" VARCHAR(255) NOT NULL, -- scheduled / manual
    source VARCHAR(255) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    profile_id BIGINT NOT NULL,
    should_save BOOLEAN NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    is_committed BOOLEAN NOT NULL DEFAULT FALSE,
    committed_at TIMESTAMP WITH TIME ZONE,
    is_failed BOOLEAN NOT NULL DEFAULT FALSE,
    failed_at TIMESTAMP WITH TIME ZONE,
    claim_available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- +goose Down

DROP TABLE IF EXISTS scout.analysis_tasks;
DROP TABLE IF EXISTS scout.detection_tags;
DROP TABLE IF EXISTS scout.detections;
DROP TABLE IF EXISTS scout.profile_settings;
DROP TABLE IF EXISTS scout.profiles;
DROP SCHEMA IF EXISTS scout;