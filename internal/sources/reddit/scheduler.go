package reddit

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/lo"

	"github.com/rishenco/scout/internal/sources"
	"github.com/rishenco/scout/pkg/models"
)

type schedulerStorage interface {
	GetSubredditsSettings(ctx context.Context, subreddits []string) (subredditsSettings []SubredditSettings, err error)
	GetPostsForScheduling(ctx context.Context, batchSize int, minScore int) (posts []PostAndComments, err error)
	MarkPostsAsScheduled(ctx context.Context, postIDs []string) error
}

type scout interface {
	ScheduleAnalysis(ctx context.Context, tasks []models.AnalysisTask) error
}

type Scheduler struct {
	storage      schedulerStorage
	scout        scout
	batchSize    int
	minScore     int
	timeout      time.Duration
	errorTimeout time.Duration
	logger       zerolog.Logger
}

func NewScheduler(
	storage schedulerStorage,
	scout scout,
	batchSize int,
	minScore int,
	timeout time.Duration,
	errorTimeout time.Duration,
	logger zerolog.Logger,
) *Scheduler {
	return &Scheduler{
		storage:      storage,
		scout:        scout,
		batchSize:    batchSize,
		minScore:     minScore,
		timeout:      timeout,
		errorTimeout: errorTimeout,
		logger:       logger,
	}
}

func (s *Scheduler) Start(ctx context.Context) error {
	timeout := s.timeout

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-time.After(timeout):
			timeout = s.timeout
			if err := s.schedulePosts(ctx); err != nil {
				s.logger.Error().
					Err(err).
					Msg("schedule posts")

				timeout = s.errorTimeout
			}
		}
	}
}

func (s *Scheduler) schedulePosts(ctx context.Context) error {
	redditPosts, err := s.storage.GetPostsForScheduling(ctx, s.batchSize, s.minScore)
	if err != nil {
		return fmt.Errorf("get posts for scheduling: %w", err)
	}

	subredditsSet := make(map[string]struct{})

	for _, post := range redditPosts {
		subredditsSet[post.Post.SubredditName] = struct{}{}
	}

	subredditsSettings, err := s.storage.GetSubredditsSettings(ctx, lo.Keys(subredditsSet))
	if err != nil {
		return fmt.Errorf("get subreddits settings: %w", err)
	}

	subredditSettingsIndex := lo.SliceToMap(
		subredditsSettings,
		func(setting SubredditSettings) (string, SubredditSettings) {
			return setting.Subreddit, setting
		},
	)

	tasks := make([]models.AnalysisTask, 0)

	for _, redditPost := range redditPosts {
		subredditSettings, ok := subredditSettingsIndex[redditPost.Post.SubredditName]
		if !ok {
			s.logger.Warn().
				Str("subreddit", redditPost.Post.SubredditName).
				Msg("subreddit settings not found")

			continue
		}

		for _, profileID := range subredditSettings.Profiles {
			tasks = append(tasks, models.AnalysisTask{
				Type: models.ScheduledTaskType,
				Parameters: models.AnalysisParameters{
					SourceID:  redditPost.Post.ID,
					ProfileID: profileID,

					Source:     sources.RedditSource,
					ShouldSave: true,
				},
			})
		}
	}

	if err := s.scout.ScheduleAnalysis(ctx, tasks); err != nil {
		return fmt.Errorf("schedule analysis: %w", err)
	}

	postIDs := lo.Map(redditPosts, func(post PostAndComments, _ int) string {
		return post.Post.ID
	})

	if err := s.storage.MarkPostsAsScheduled(ctx, postIDs); err != nil {
		return fmt.Errorf("mark posts as scheduled: %w", err)
	}

	return nil
}
