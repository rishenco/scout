package pg

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/samber/lo"

	"github.com/rishenco/scout/pkg/models"
)

type TaskStorage struct {
	pool                       *pgxpool.Pool
	errorTimeoutBeforeClaiming time.Duration
	logger                     zerolog.Logger
}

func NewTaskStorage(
	pool *pgxpool.Pool,
	errorTimeoutBeforeClaiming time.Duration,
	logger zerolog.Logger,
) *TaskStorage {
	return &TaskStorage{
		pool:                       pool,
		errorTimeoutBeforeClaiming: errorTimeoutBeforeClaiming,
		logger:                     logger,
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
		"is_failed",
		"failed_at",
		"errors",
	}

	rows := lo.Map(tasks, func(task models.AnalysisTask, _ int) []any {
		return []any{
			task.Parameters.Source,     // source
			task.Parameters.SourceID,   // source_id
			task.Parameters.ProfileID,  // profile_id
			task.Parameters.ShouldSave, // should_save
			false,                      // is_claimed
			nil,                        // claimed_at
			false,                      // is_committed
			nil,                        // committed_at
			false,                      // is_failed
			nil,                        // failed_at
			[]string{},                 // errors
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
		SET is_claimed = true, claimed_at = NOW()
		WHERE id IN (
			SELECT id
			FROM scout.analysis_tasks
			WHERE is_claimed = false AND is_committed = false AND is_failed = false AND claim_available_at < NOW()
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		RETURNING id, source, source_id, profile_id, should_save
	`

	row := s.pool.QueryRow(ctx, query)

	err = row.Scan(
		&task.ID,
		&task.Parameters.Source,
		&task.Parameters.SourceID,
		&task.Parameters.ProfileID,
		&task.Parameters.ShouldSave,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.AnalysisTask{}, false, nil
		}

		return models.AnalysisTask{}, false, fmt.Errorf("scan: %w", err)
	}

	return task, true, nil
}

func (s *TaskStorage) Unclaim(ctx context.Context, taskID int64) error {
	query := `
		UPDATE scout.analysis_tasks
		SET is_claimed = false, claimed_at = NULL
		WHERE id = $1
	`

	_, err := s.pool.Exec(ctx, query, taskID)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *TaskStorage) AddError(ctx context.Context, taskID int64, err string) error {
	query := `
		UPDATE scout.analysis_tasks
		SET errors = array_append(errors, $1), 
			claim_available_at = NOW() + $2 * interval '1 second'
		WHERE id = $3
	`

	_, execErr := s.pool.Exec(ctx, query, err, s.errorTimeoutBeforeClaiming.Seconds(), taskID)
	if execErr != nil {
		return fmt.Errorf("exec: %w", execErr)
	}

	return nil
}

func (s *TaskStorage) Fail(ctx context.Context, taskID int64) error {
	query := `
		UPDATE scout.analysis_tasks
		SET is_failed = true, failed_at = NOW()
		WHERE id = $1
	`

	_, err := s.pool.Exec(ctx, query, taskID)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *TaskStorage) Commit(ctx context.Context, taskID int64) error {
	query := `
		UPDATE scout.analysis_tasks
		SET is_committed = true, committed_at = NOW()
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
		SET is_claimed = false, claimed_at = NULL
		WHERE is_claimed AND NOT is_committed AND claimed_at < NOW() - $1 * interval '1 second'
	`

	_, err := s.pool.Exec(ctx, query, timeout.Seconds())
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func UnclaimTasks(
	ctx context.Context,
	taskStorage *TaskStorage,
	interval time.Duration,
	claimTimeout time.Duration,
	logger zerolog.Logger,
) {
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
