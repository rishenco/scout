package pg

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
)

type RequestsStorage struct {
	pool   *pgxpool.Pool
	logger zerolog.Logger
}

func NewRequestsStorage(pool *pgxpool.Pool, logger zerolog.Logger) *RequestsStorage {
	return &RequestsStorage{
		pool:   pool,
		logger: logger,
	}
}

func (s *RequestsStorage) Save(
	ctx context.Context,
	service string,
	requestType string,
	request any,
	response any,
) error {
	query := `
		INSERT INTO audit.requests (service, request_type, request, response)
		VALUES ($1, $2, $3, $4)
	`

	_, err := s.pool.Exec(ctx, query, service, requestType, request, response)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}
