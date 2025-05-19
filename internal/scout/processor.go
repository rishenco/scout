package scout

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog"

	"github.com/rishenco/scout/pkg/models"
)

type taskQueue interface {
	Claim(ctx context.Context) (task models.AnalysisTask, anyTask bool, err error)
	Unclaim(ctx context.Context, taskID int64) error
	AddError(ctx context.Context, taskID int64, err string) error
	Fail(ctx context.Context, taskID int64) error
	Commit(ctx context.Context, taskID int64) error
}

type scout interface {
	GetProfile(ctx context.Context, profileID int64) (profile models.Profile, found bool, err error)
	Analyze(
		ctx context.Context,
		source string,
		sourceID string,
		profileSettings models.ProfileSettings,
		shouldSave bool,
	) (detection models.Detection, err error)
}

type TaskProcessor struct {
	taskQueue      taskQueue
	scout          scout
	timeout        time.Duration
	errorTimeout   time.Duration
	noTasksTimeout time.Duration
	maxAttempts    int
	workers        int
	logger         zerolog.Logger
}

func NewTaskProcessor(
	taskQueue taskQueue,
	scout scout,
	timeout time.Duration,
	errorTimeout time.Duration,
	noTasksTimeout time.Duration,
	maxAttempts int,
	workers int,
	logger zerolog.Logger,
) *TaskProcessor {
	return &TaskProcessor{
		taskQueue:      taskQueue,
		scout:          scout,
		timeout:        timeout,
		errorTimeout:   errorTimeout,
		noTasksTimeout: noTasksTimeout,
		maxAttempts:    maxAttempts,
		workers:        workers,
		logger:         logger,
	}
}

func (p *TaskProcessor) Start(ctx context.Context) {
	wg := new(sync.WaitGroup)

	p.logger.Info().
		Int("workers", p.workers).
		Msg("starting task processor")

	for range p.workers {
		wg.Add(1)
		go func() {
			defer wg.Done()

			p.processTasks(ctx)
		}()
	}

	wg.Wait()
}

func (p *TaskProcessor) processTasks(ctx context.Context) {
	timeout := p.timeout

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(timeout):
			timeout = p.timeout

			anyTask, err := p.processTask(ctx)

			if err != nil {
				p.logger.Error().
					Err(err).
					Msg("process task")

				timeout = p.errorTimeout

				continue
			}

			if !anyTask {
				timeout = p.noTasksTimeout

				continue
			}
		}
	}
}

func (p *TaskProcessor) processTask(ctx context.Context) (anyTask bool, err error) {
	task, anyTask, err := p.taskQueue.Claim(ctx)
	if err != nil {
		return false, fmt.Errorf("claim analysis task for processing: %w", err)
	}

	if !anyTask {
		return false, nil
	}

	p.logger.Info().
		Int64("task_id", task.ID).
		Msg("claimed task")

	if len(task.Errors) >= p.maxAttempts {
		p.logger.Error().
			Int64("task_id", task.ID).
			Msg("task failed max attempts")

		if err := p.taskQueue.Fail(ctx, task.ID); err != nil {
			return false, fmt.Errorf("fail task: %w", err)
		}

		return false, nil
	}

	defer func() {
		if err != nil {
			if addErrorErr := p.taskQueue.AddError(ctx, task.ID, err.Error()); addErrorErr != nil {
				p.logger.Error().
					Err(addErrorErr).
					Msg("failed to add error to task")

				err = errors.Join(err, fmt.Errorf("add error to task: %w", addErrorErr))
			}
		}

		if unclaimErr := p.taskQueue.Unclaim(ctx, task.ID); unclaimErr != nil {
			p.logger.Error().
				Err(unclaimErr).
				Msg("failed to unclaim task")

			err = errors.Join(err, fmt.Errorf("unclaim task: %w", unclaimErr))
		}
	}()

	profile, found, err := p.scout.GetProfile(ctx, task.Parameters.ProfileID)
	if err != nil {
		return false, fmt.Errorf("get profile: %w", err)
	}

	if !found {
		p.logger.Error().
			Int64("profile_id", task.Parameters.ProfileID).
			Msg("profile not found")

		return false, fmt.Errorf("profile not found: profile id = %d", task.Parameters.ProfileID)
	}

	profileSettings, found := profile.SourcesSettings[task.Parameters.Source]
	if !found {
		if profile.DefaultSettings == nil {
			err := fmt.Errorf(
				"profile settings not found: source = %s, profile id = %d",
				task.Parameters.Source,
				task.Parameters.ProfileID,
			)

			return false, err
		}

		profileSettings = *profile.DefaultSettings
	}

	_, err = p.scout.Analyze(
		ctx,
		task.Parameters.Source,
		task.Parameters.SourceID,
		profileSettings,
		task.Parameters.ShouldSave,
	)
	if err != nil {
		return false, fmt.Errorf("analyze post: %w", err)
	}

	if err := p.taskQueue.Commit(ctx, task.ID); err != nil {
		return false, fmt.Errorf("commit analysis task: %w", err)
	}

	p.logger.Info().
		Int64("task_id", task.ID).
		Msg("committed task")

	return anyTask, nil
}
