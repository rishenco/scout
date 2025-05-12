-- Create reddit schema
CREATE SCHEMA IF NOT EXISTS reddit;

-- Create posts table for storing reddit posts
CREATE TABLE IF NOT EXISTS reddit.posts (
    id BIGSERIAL PRIMARY KEY,
    post_id VARCHAR(255) NOT NULL UNIQUE,
    post_json JSONB NOT NULL,
    enriched_post_json JSONB,
    post_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    row_created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    enriched_at TIMESTAMP WITH TIME ZONE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    is_enriched BOOLEAN NOT NULL DEFAULT FALSE,
    is_scheduled BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create table for subreddit settings
CREATE TABLE IF NOT EXISTS reddit.subreddit_settings (
    id SERIAL PRIMARY KEY,
    subreddit VARCHAR(255) NOT NULL UNIQUE,
    profiles BIGINT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
); 