FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o scout ./cmd/main.go

FROM alpine:3.17

WORKDIR /app

RUN apk --no-cache add ca-certificates

COPY --from=builder /app/scout .
COPY --from=builder /app/settings.yaml .

CMD ["./scout"] 