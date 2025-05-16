package scout

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/rishenco/scout/pkg/models"
	"github.com/rs/zerolog"
)

type taskQueue interface {
	Claim(ctx context.Context) (task models.AnalysisTask, anyTask bool, err error)
	Commit(ctx context.Context, taskID int64) error
}

type scout interface {
	GetProfile(ctx context.Context, profileID int64) (profile models.Profile, found bool, err error)
	Analyze(ctx context.Context, source string, sourceID string, profileSettings models.ProfileSettings, shouldSave bool) (detection models.Detection, err error)
}

type TaskProcessor struct {
	taskQueue      taskQueue
	scout          scout
	batchSize      int
	timeout        time.Duration
	errorTimeout   time.Duration
	noTasksTimeout time.Duration
	workers        int
	logger         zerolog.Logger
}

func NewTaskProcessor(
	taskQueue taskQueue,
	scout scout,
	batchSize int,
	timeout time.Duration,
	errorTimeout time.Duration,
	noTasksTimeout time.Duration,
	workers int,
	logger zerolog.Logger,
) *TaskProcessor {
	return &TaskProcessor{
		taskQueue:      taskQueue,
		scout:          scout,
		batchSize:      batchSize,
		timeout:        timeout,
		errorTimeout:   errorTimeout,
		noTasksTimeout: noTasksTimeout,
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
		Int64("profile_id", task.ProfileID).
		Str("source", task.Source).
		Str("source_id", task.SourceID).
		Msg("processing task")

	profile, found, err := p.scout.GetProfile(ctx, task.ProfileID)
	if err != nil {
		return false, fmt.Errorf("get profile: %w", err)
	}

	if !found {
		p.logger.Error().
			Int64("profile_id", task.ProfileID).
			Msg("profile not found")

		if err := p.taskQueue.Commit(ctx, task.ID); err != nil {
			return false, fmt.Errorf("commit analysis task: %w", err)
		}

		return false, nil
	}

	profileSettings, found := profile.SourcesSettings[task.Source]
	if !found {
		if profile.DefaultSettings == nil {
			return false, fmt.Errorf("profile settings not found: source = %s, profile id = %d", task.Source, task.ProfileID)
		}

		profileSettings = *profile.DefaultSettings
	}

	_, err = p.scout.Analyze(ctx, task.Source, task.SourceID, profileSettings, task.ShouldSave)
	if err != nil {
		return false, fmt.Errorf("analyze post: %w", err)
	}

	if err := p.taskQueue.Commit(ctx, task.ID); err != nil {
		return false, fmt.Errorf("commit analysis task: %w", err)
	}

	return anyTask, nil
}
