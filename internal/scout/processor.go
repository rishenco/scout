package scout

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/rishenco/scout/internal/models"
	"github.com/rs/zerolog"
)

type scout[PostType models.PostInterface] interface {
	GetProfile(ctx context.Context, profileID int64) (models.Profile, error)
	GetPost(ctx context.Context, postID int64) (PostType, error)
	Analyze(ctx context.Context, post PostType, profile models.Profile, shouldPublish bool) (models.Detection, error)
}

type TaskProcessor[PostType models.PostInterface] struct {
	taskStorage    taskStorage
	scout          scout[PostType]
	source         string
	batchSize      int
	timeout        time.Duration
	errorTimeout   time.Duration
	noTasksTimeout time.Duration
	workers        int
	logger         zerolog.Logger
}

func NewTaskProcessor[PostType models.PostInterface](
	taskStorage taskStorage,
	scout scout[PostType],
	source string,
	batchSize int,
	timeout time.Duration,
	errorTimeout time.Duration,
	noTasksTimeout time.Duration,
	workers int,
	logger zerolog.Logger,
) *TaskProcessor[PostType] {
	return &TaskProcessor[PostType]{
		taskStorage:    taskStorage,
		scout:          scout,
		source:         source,
		batchSize:      batchSize,
		timeout:        timeout,
		errorTimeout:   errorTimeout,
		noTasksTimeout: noTasksTimeout,
		workers:        workers,
		logger:         logger,
	}
}

func (p *TaskProcessor[PostType]) Start(ctx context.Context) {
	wg := new(sync.WaitGroup)

	for range p.workers {
		wg.Add(1)
		go func() {
			defer wg.Done()

			p.processTasks(ctx)
		}()
	}

	wg.Wait()
}

func (p *TaskProcessor[PostType]) processTasks(ctx context.Context) {
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

func (p *TaskProcessor[PostType]) processTask(ctx context.Context) (anyTask bool, err error) {
	task, anyTask, err := p.taskStorage.Claim(ctx, p.source)
	if err != nil {
		return false, fmt.Errorf("claim analysis task for processing: %w", err)
	}

	if !anyTask {
		return false, nil
	}

	post, err := p.scout.GetPost(ctx, task.PostID)
	if err != nil {
		return false, fmt.Errorf("get post: %w", err)
	}

	profile, err := p.scout.GetProfile(ctx, task.ProfileID)
	if err != nil {
		return false, fmt.Errorf("get profile: %w", err)
	}

	_, err = p.scout.Analyze(ctx, post, profile, task.ShouldSave)
	if err != nil {
		return false, fmt.Errorf("analyze post: %w", err)
	}

	return anyTask, nil
}
