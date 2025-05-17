package reddit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/rishenco/scout/pkg/models"
	"github.com/rs/zerolog"
)

type toolkitStorage interface {
	GetRawPosts(ctx context.Context, postIDs []string) ([]RawPostAndComments, error)
	GetPosts(ctx context.Context, postIDs []string) ([]PostAndComments, error)
	GetAllSubredditSettings(ctx context.Context) ([]SubredditSettings, error)
	GetAllSubredditSettingsWithProfileID(ctx context.Context, profileID int64) ([]SubredditSettings, error)
	AddProfilesToSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error
	RemoveProfilesFromSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error
}

type analyzer interface {
	Analyze(ctx context.Context, post PostAndComments, profileSettings models.ProfileSettings) (models.Detection, error)
}

type Toolkit struct {
	storage  toolkitStorage
	analyzer analyzer
	logger   zerolog.Logger
}

func NewToolkit(storage toolkitStorage, analyzer analyzer, logger zerolog.Logger) *Toolkit {
	return &Toolkit{
		storage:  storage,
		analyzer: analyzer,
		logger:   logger,
	}
}

func (t *Toolkit) Analyze(ctx context.Context, postID string, profileSettings models.ProfileSettings) (models.Detection, error) {
	posts, err := t.storage.GetPosts(ctx, []string{postID})
	if err != nil {
		return models.Detection{}, fmt.Errorf("get reddit post: %w", err)
	}

	if len(posts) == 0 {
		return models.Detection{}, fmt.Errorf("post not found")
	}

	detection, err := t.analyzer.Analyze(ctx, posts[0], profileSettings)
	if err != nil {
		return models.Detection{}, fmt.Errorf("analyze post: %w", err)
	}

	return detection, nil
}

func (t *Toolkit) GetSourcePosts(ctx context.Context, ids []string) ([]models.SourcePost, error) {
	rawPosts, err := t.storage.GetRawPosts(ctx, ids)
	if err != nil {
		return nil, fmt.Errorf("get raw posts: %w", err)
	}

	posts := make([]models.SourcePost, 0, len(rawPosts))
	for _, rawPost := range rawPosts {
		sourcePost := models.SourcePost{
			SourceID: rawPost.PostID,
		}

		if len(rawPost.Data) == 0 {
			continue
		}

		if err := json.Unmarshal(rawPost.Data, &sourcePost.Post); err != nil {
			return nil, fmt.Errorf("unmarshal post: %w", err)
		}

		posts = append(posts, sourcePost)
	}

	return posts, nil
}

func (t *Toolkit) GetAllSubredditSettings(ctx context.Context) ([]SubredditSettings, error) {
	return t.storage.GetAllSubredditSettings(ctx)
}

func (t *Toolkit) GetAllSubredditSettingsWithProfileID(ctx context.Context, profileID int64) ([]SubredditSettings, error) {
	return t.storage.GetAllSubredditSettingsWithProfileID(ctx, profileID)
}

func (t *Toolkit) AddProfilesToSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error {
	return t.storage.AddProfilesToSubreddit(ctx, subreddit, profileIDs)
}

func (t *Toolkit) RemoveProfilesFromSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error {
	return t.storage.RemoveProfilesFromSubreddit(ctx, subreddit, profileIDs)
}
