-- Create audit schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS audit;

-- Create requests table for storing service requests and responses
CREATE TABLE IF NOT EXISTS audit.requests (
    id BIGSERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    request_type VARCHAR(255) NOT NULL,
    request JSONB,
    response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_service ON audit.requests (service);
CREATE INDEX IF NOT EXISTS idx_requests_request_type ON audit.requests (request_type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON audit.requests (created_at);