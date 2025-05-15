package pg

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rishenco/scout/pkg/models"
	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

type TaskStorage struct {
	pool   *pgxpool.Pool
	logger zerolog.Logger
}

func NewTaskStorage(pool *pgxpool.Pool, logger zerolog.Logger) *TaskStorage {
	return &TaskStorage{
		pool:   pool,
		logger: logger,
	}
}

func (s *TaskStorage) Add(ctx context.Context, tasks []models.AnalysisTask) error {
	columns := []string{
		"source",
		"source_id",
		"profile_id",
		"should_save",
		"is_claimed",
		"claimed_at",
		"is_committed",
		"committed_at",
	}

	rows := lo.Map(tasks, func(task models.AnalysisTask, _ int) []any {
		return []any{
			task.Source,
			task.SourceID,
			task.ProfileID,
			task.ShouldSave,
			false,
			nil,
			false,
			nil,
		}
	})

	_, err := s.pool.CopyFrom(
		ctx,
		pgx.Identifier{"scout", "analysis_tasks"},
		columns,
		pgx.CopyFromRows(rows),
	)
	if err != nil {
		return fmt.Errorf("copy from: %w", err)
	}

	return nil
}

func (s *TaskStorage) Claim(ctx context.Context) (task models.AnalysisTask, anyTask bool, err error) {
	query := `
		UPDATE scout.analysis_tasks
		SET is_claimed = true, claimed_at = now()
		WHERE is_claimed = false AND is_committed = false
		RETURNING id, source, source_id, profile_id, should_save
	`

	row := s.pool.QueryRow(ctx, query)

	err = row.Scan(&task.ID, &task.Source, &task.SourceID, &task.ProfileID, &task.ShouldSave)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.AnalysisTask{}, false, nil
		}

		return models.AnalysisTask{}, false, fmt.Errorf("scan: %w", err)
	}

	return task, true, nil
}

func (s *TaskStorage) Commit(ctx context.Context, taskID int64) error {
	query := `
		UPDATE scout.analysis_tasks
		SET is_committed = true, committed_at = now()
		WHERE id = $1
	`

	_, err := s.pool.Exec(ctx, query, taskID)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *TaskStorage) UnclaimOldTasks(ctx context.Context, timeout time.Duration) error {
	query := `
		UPDATE scout.analysis_tasks
		SET is_claimed = false, claimed_at = null
		WHERE is_claimed AND not is_committed AND claimed_at < now() - $1 * interval '1 second'
	`

	_, err := s.pool.Exec(ctx, query, timeout.Seconds())
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func UnclaimTasks(ctx context.Context, taskStorage *TaskStorage, interval time.Duration, claimTimeout time.Duration, logger zerolog.Logger) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(interval):
			if err := taskStorage.UnclaimOldTasks(ctx, claimTimeout); err != nil {
				logger.Error().Err(err).Msg("unclaim old tasks")
			}
		}
	}
}
