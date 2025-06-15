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
	Claim(ctx context.Context, taskTypes []string, profileIDs []int64) (task models.AnalysisTask, anyTask bool, err error)
	Unclaim(ctx context.Context, taskID int64) error
	AddError(ctx context.Context, taskID int64, err string) error
	Fail(ctx context.Context, taskID int64) error
	Commit(ctx context.Context, taskID int64) error
}

type scout interface {
	GetAllProfiles(ctx context.Context) ([]models.Profile, error)
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
	taskQueue         taskQueue
	scout             scout
	profilesCache     *profilesCache
	profilesCacheLock sync.Mutex
	timeout           time.Duration
	errorTimeout      time.Duration
	noTasksTimeout    time.Duration
	maxAttempts       int
	workers           int
	logger            zerolog.Logger
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

			p.taskLoop(ctx, "active_profiles", p.processActiveProfilesTask)
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()

			p.taskLoop(ctx, "inactive_profiles", p.processInactiveProfilesTask)
		}()
	}

	wg.Wait()
}

func (p *TaskProcessor) taskLoop(
	ctx context.Context,
	label string,
	processor func(ctx context.Context) (anyTask bool, err error),
) {
	timeout := p.timeout

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(timeout):
			timeout = p.timeout

			anyTask, err := processor(ctx)

			if err != nil {
				p.logger.Error().
					Err(err).
					Str("label", label).
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

func (p *TaskProcessor) processActiveProfilesTask(ctx context.Context) (anyTask bool, err error) {
	activeProfiles, err := p.getActiveProfiles(ctx)
	if err != nil {
		return false, fmt.Errorf("get active profiles: %w", err)
	}

	return p.processTask(ctx, []string{models.ScheduledTaskType, models.ManualTaskType}, activeProfiles)
}

func (p *TaskProcessor) processInactiveProfilesTask(ctx context.Context) (anyTask bool, err error) {
	inactiveProfiles, err := p.getInactiveProfiles(ctx)
	if err != nil {
		return false, fmt.Errorf("get inactive profiles: %w", err)
	}

	return p.processTask(ctx, []string{models.ManualTaskType}, inactiveProfiles)
}

func (p *TaskProcessor) processTask(ctx context.Context, taskTypes []string, profileIDs []int64) (anyTask bool, err error) {
	task, anyTask, err := p.taskQueue.Claim(ctx, taskTypes, profileIDs)
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

	if !profile.Active && task.Type != models.ManualTaskType {
		p.logger.Warn().
			Int64("profile_id", task.Parameters.ProfileID).
			Msg("profile is not active but scheduled task was claimed")

		p.invalidateProfilesCache(ctx) // invalidate caches to avoid claiming more tasks for inactive profiles

		return false, nil
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

func (p *TaskProcessor) invalidateProfilesCache(ctx context.Context) error {
	p.profilesCacheLock.Lock()
	defer p.profilesCacheLock.Unlock()

	p.profilesCache = nil

	return nil
}

func (p *TaskProcessor) getActiveProfiles(ctx context.Context) ([]int64, error) {
	p.profilesCacheLock.Lock()
	defer p.profilesCacheLock.Unlock()

	if err := p.ensureProfilesCacheUnsafe(ctx); err != nil {
		return nil, fmt.Errorf("ensure profiles cache: %w", err)
	}

	return p.profilesCache.activeProfiles, nil
}

func (p *TaskProcessor) getInactiveProfiles(ctx context.Context) ([]int64, error) {
	p.profilesCacheLock.Lock()
	defer p.profilesCacheLock.Unlock()

	if err := p.ensureProfilesCacheUnsafe(ctx); err != nil {
		return nil, fmt.Errorf("ensure profiles cache: %w", err)
	}

	return p.profilesCache.inactiveProfiles, nil
}

func (p *TaskProcessor) ensureProfilesCacheUnsafe(ctx context.Context) error {
	if p.profilesCache != nil && p.profilesCache.validUntil.After(time.Now()) {
		return nil
	}

	profiles, err := p.scout.GetAllProfiles(ctx)
	if err != nil {
		return fmt.Errorf("get all profiles: %w", err)
	}

	p.profilesCache = &profilesCache{
		activeProfiles:   make([]int64, 0),
		inactiveProfiles: make([]int64, 0),
		validUntil:       time.Now().Add(time.Second * 30),
	}

	for _, profile := range profiles {
		if profile.Active {
			p.profilesCache.activeProfiles = append(p.profilesCache.activeProfiles, profile.ID)
		} else {
			p.profilesCache.inactiveProfiles = append(p.profilesCache.inactiveProfiles, profile.ID)
		}
	}

	return nil
}

type profilesCache struct {
	activeProfiles   []int64 // profiles for scheduled tasks
	inactiveProfiles []int64 // profiles for manual tasks
	validUntil       time.Time
}
