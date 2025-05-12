package reddit

import (
	"context"
	"fmt"
	"time"

	"github.com/rishenco/scout/internal/models"
	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

type schedulerStorage interface {
	GetSubredditsSettings(ctx context.Context, subreddits []string) (subredditsSettings []SubredditSettings, err error)
	GetPostsForScheduling(ctx context.Context, batchSize int, minScore int) (posts []PostAndComments, err error)
	MarkPostsAsScheduled(ctx context.Context, postIDs []string) error
}

type scout interface {
	AddPosts(ctx context.Context, posts []PostAndComments) (sourceIDToPostID map[string]int64, err error)
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

	redditIDToPostID, err := s.scout.AddPosts(ctx, redditPosts)
	if err != nil {
		return fmt.Errorf("add posts: %w", err)
	}

	subredditsSet := make(map[string]struct{})

	for _, post := range redditPosts {
		subredditsSet[post.Post.SubredditName] = struct{}{}
	}

	subredditsSettings, err := s.storage.GetSubredditsSettings(ctx, lo.Keys(subredditsSet))
	if err != nil {
		return fmt.Errorf("get subreddits settings: %w", err)
	}

	subredditSettingsIndex := lo.SliceToMap(subredditsSettings, func(setting SubredditSettings) (string, SubredditSettings) {
		return setting.Subreddit, setting
	})

	tasks := make([]models.AnalysisTask, 0)

	for _, redditPost := range redditPosts {
		scoutPostID, ok := redditIDToPostID[redditPost.ID()]
		if !ok {
			s.logger.Warn().
				Str("reddit_id", redditPost.ID()).
				Msg("scout post id not found")

			continue
		}

		subredditSettings, ok := subredditSettingsIndex[redditPost.Post.SubredditName]
		if !ok {
			s.logger.Warn().
				Str("subreddit", redditPost.Post.SubredditName).
				Msg("subreddit settings not found")

			continue
		}

		for _, profileID := range subredditSettings.Profiles {
			tasks = append(tasks, models.AnalysisTask{
				PostID:    scoutPostID,
				ProfileID: profileID,
				Source:    models.RedditSource,
			})
		}
	}

	if err := s.scout.ScheduleAnalysis(ctx, tasks); err != nil {
		return fmt.Errorf("schedule analysis: %w", err)
	}

	return nil
}
