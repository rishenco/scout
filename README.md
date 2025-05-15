# Idea Searcher

A service that collects project ideas from Reddit, processes them using OpenAI, and saves them to PostgreSQL.

## Setup

### Prerequisites

- Go 1.20 or higher
- PostgreSQL database
- Reddit API credentials
- OpenAI API key

### Environment Variables

Copy these to a `.env` file:

```
# OpenAI
OPENAI_KEY=your_openai_api_key

# Postgres
POSTGRES_CONN_STRING=postgres://username:password@localhost:5432/dbname

# Reddit API
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
REDDIT_USER_AGENT="idea-searcher:v1.0 (by /u/your_username)"

# Application settings
SUBREDDITS=golang,programming,startups,SideProject
POSTS_CUTOFF=168h  # 7 days
READ_INTERVAL=30m  # 30 minutes
```

### Database Setup

This project uses PostgreSQL for data storage. The database configuration is managed through Docker Compose.

#### Prerequisites

- Docker and Docker Compose installed on your system

#### Starting the Database

```bash
# Start the PostgreSQL database
docker-compose up -d
```

This will start a PostgreSQL server with the following configuration:
- Database: idea_searcher
- User: idea_searcher
- Password: handy_idea_searcher_thingy
- Port: 9356 (mapped to the standard PostgreSQL port 5432 inside the container)

The database migrations will be automatically applied on container startup, as they are mounted in the Docker entrypoint initialization directory.

#### Connecting to the Database

```bash
# Using psql from your host machine
psql -h localhost -p 9356 -U idea_searcher -d idea_searcher

# Using psql from inside the container
docker exec -it idea-searcher-db psql -U idea_searcher -d idea_searcher
```

#### Stopping the Database

```bash
# Stop the services
docker-compose down

# To remove the persistent volume as well
docker-compose down -v
```

## Database Schema

For detailed information about the database schema and migrations, please refer to [migrations/README.md](migrations/README.md).

## Running Tests

To run tests with real Reddit API requests:

```bash
# Setup environment variables for tests
export REDDIT_CLIENT_ID=your_reddit_client_id
export REDDIT_CLIENT_SECRET=your_reddit_client_secret
export REDDIT_USERNAME=your_reddit_username
export REDDIT_PASSWORD=your_reddit_password
export REDDIT_USER_AGENT="idea-searcher:v1.0 (by /u/your_username)"

# Run all tests
go test ./tests/...

# Run just the Reddit client tests
go test ./tests/reddit -run TestClientSuite

# Run just the Reddit reader tests
go test ./tests/reddit -run TestReaderSuite

# Skip long-running tests
go test ./tests/... -short
```

## Building and Running

```bash
# Build the application
go build -o idea-searcher ./cmd

# Run the application
./idea-searcher
```

## Project Structure

- `cmd/`: Application entry point
- `internal/`:
  - `config/`: Configuration loading
  - `models/`: Data models
  - `repo/`: Data repositories (Reddit, OpenAI, PostgreSQL)
  - `services/`: Business logic
  - `transport/`: Data ingestion from external sources
- `tests/`: Integration tests