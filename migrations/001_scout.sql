-- +goose Up

-- Create scout schema
CREATE SCHEMA IF NOT EXISTS scout;

-- Create profiles tables
CREATE TABLE IF NOT EXISTS scout.profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (name)
);

-- Create profile settings table
CREATE TABLE IF NOT EXISTS scout.profile_settings (
    profile_id BIGINT NOT NULL,
    source VARCHAR(255) NULL,
    relevancy_filter VARCHAR(8192),
    extracted_properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (profile_id, source)
);

-- Create detections table
CREATE TABLE IF NOT EXISTS scout.detections (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    profile_id BIGINT NOT NULL,
    is_relevant BOOLEAN NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create detection tags table
CREATE TABLE IF NOT EXISTS scout.detection_tags (
    detection_id BIGINT NOT NULL,
    relevancy_detected_correctly BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (detection_id)
);

-- Create analysis tasks table
CREATE TABLE IF NOT EXISTS scout.analysis_tasks (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    profile_id BIGINT NOT NULL,
    should_save BOOLEAN NOT NULL,
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed_at TIMESTAMP WITH TIME ZONE,
    is_committed BOOLEAN NOT NULL DEFAULT FALSE,
    committed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- +goose Down

DROP TABLE IF EXISTS scout.analysis_tasks;
DROP TABLE IF EXISTS scout.detection_tags;
DROP TABLE IF EXISTS scout.detections;
DROP TABLE IF EXISTS scout.profile_settings;
DROP TABLE IF EXISTS scout.profiles;
DROP SCHEMA IF EXISTS scout;