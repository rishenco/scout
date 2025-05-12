-- Create scout schema
CREATE SCHEMA IF NOT EXISTS scout;

-- Create detections table
CREATE TABLE IF NOT EXISTS scout.detections (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    post_id BIGINT NOT NULL,
    profile_id BIGINT NOT NULL,
    is_relevant BOOLEAN NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS scout.posts (
    id BIGSERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source, source_id)
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS scout.profiles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    relevancy_filter TEXT,
    extracted_properties JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 