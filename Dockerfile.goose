FROM golang:1.24-alpine

RUN go install github.com/pressly/goose/v3/cmd/goose@latest

WORKDIR /app

ENTRYPOINT ["goose", "-dir", "/app/migrations", "postgres", "postgresql://scout:super_secret_password@postgres:5432/scout?sslmode=disable", "up"] 