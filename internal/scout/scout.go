package scout

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/rishenco/scout/internal/models"
)

type storage interface {
	SaveDetection(ctx context.Context, record models.DetectionRecord) error
	SavePosts(ctx context.Context, posts []models.Post) (sourceIDToPostID map[string]int64, err error)
	GetProfile(ctx context.Context, profileID int64) (models.Profile, error)
	GetPost(ctx context.Context, postID int64) (models.Post, error)
}

type taskStorage interface {
	Add(ctx context.Context, tasks []models.AnalysisTask) error
	Claim(ctx context.Context, source string) (task models.AnalysisTask, anyTask bool, err error)
	Commit(ctx context.Context, taskID int64) error
}

type analyzer[PostType models.PostInterface] interface {
	Analyze(ctx context.Context, post PostType, profile models.Profile) (models.Detection, error)
}

type postCodec[PostType models.PostInterface] interface {
	Decode(data []byte) (PostType, error)
	Encode(post PostType) ([]byte, error)
}

type Scout[PostType models.PostInterface] struct {
	analyzer    analyzer[PostType]
	storage     storage
	taskStorage taskStorage
	postCodec   postCodec[PostType]
	source      string
	logger      zerolog.Logger
}

func New[PostType models.PostInterface](
	analyzer analyzer[PostType],
	storage storage,
	taskStorage taskStorage,
	postCodec postCodec[PostType],
	source string,
	logger zerolog.Logger,
) *Scout[PostType] {
	return &Scout[PostType]{
		analyzer:    analyzer,
		storage:     storage,
		taskStorage: taskStorage,
		postCodec:   postCodec,
		source:      source,
		logger:      logger,
	}
}

func (s *Scout[PostType]) Analyze(ctx context.Context, post PostType, profile models.Profile, shouldSave bool) (models.Detection, error) {
	logger := s.logger.With().Str("post_id", post.ID()).Str("source", post.Source()).Logger()

	// Analyze post
	detection, err := s.analyzer.Analyze(ctx, post, profile)
	if err != nil {
		return models.Detection{}, fmt.Errorf("analysis failed for profile '%s': %w", profile.Name, err)
	}

	// Save detection to database
	record := models.DetectionRecord{
		Source:     s.source,
		PostID:     post.ID(),
		ProfileID:  profile.ID,
		IsRelevant: detection.IsRelevant,
		Properties: detection.Properties,
	}

	if shouldSave {
		if err := s.storage.SaveDetection(ctx, record); err != nil {
			logger.Error().Err(err).Msg("failed to save post")

			return models.Detection{}, fmt.Errorf("save report: %w", err)
		}
	}

	logger.Info().Msg("post analyzed")

	return detection, nil
}

func (s *Scout[PostType]) GetProfile(ctx context.Context, profileID int64) (models.Profile, error) {
	profile, err := s.storage.GetProfile(ctx, profileID)
	if err != nil {
		return models.Profile{}, fmt.Errorf("get profile from storage: %w", err)
	}

	return profile, nil
}

func (s *Scout[PostType]) GetPost(ctx context.Context, postID int64) (PostType, error) {
	var post PostType

	storagePost, err := s.storage.GetPost(ctx, postID)

	if err != nil {
		return post, fmt.Errorf("get post from storage: %w", err)
	}

	post, err = s.postCodec.Decode(storagePost.Data)
	if err != nil {
		return post, fmt.Errorf("decode post: %w", err)
	}

	return post, nil
}

func (s *Scout[PostType]) AddPosts(ctx context.Context, posts []PostType) (sourceIDToPostID map[string]int64, err error) {
	generalPosts := make([]models.Post, 0, len(posts))

	for _, post := range posts {
		encodedPost, err := s.postCodec.Encode(post)
		if err != nil {
			return nil, fmt.Errorf("encode post: %w", err)
		}

		generalPosts = append(generalPosts, models.Post{
			Source:   s.source,
			SourceID: post.ID(),
			Data:     encodedPost,
		})
	}

	sourceIDToPostID, err = s.storage.SavePosts(ctx, generalPosts)
	if err != nil {
		return nil, fmt.Errorf("save posts: %w", err)
	}

	return sourceIDToPostID, nil
}

func (s *Scout[PostType]) ScheduleAnalysis(ctx context.Context, tasks []models.AnalysisTask) error {
	return s.taskStorage.Add(ctx, tasks)
}
