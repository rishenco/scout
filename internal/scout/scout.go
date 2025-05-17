package scout

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/rishenco/scout/pkg/models"
)

type storage interface {
	GetAllProfiles(ctx context.Context) ([]models.Profile, error)
	GetProfile(ctx context.Context, id int64) (profile models.Profile, found bool, err error)
	DeleteProfileByID(ctx context.Context, id int64) error
	CreateProfile(ctx context.Context, profile models.Profile) (id int64, err error)
	UpdateProfile(ctx context.Context, update models.ProfileUpdate) error
	SaveDetection(ctx context.Context, record models.DetectionRecord) error
	ListDetections(ctx context.Context, query models.DetectionQuery) ([]models.DetectionRecord, error)
	GetDetectionTags(ctx context.Context, detectionIDs []int64) ([]models.DetectionTags, error)
	UpdateTags(ctx context.Context, detectionID int64, update models.DetectionTagsUpdate) (models.DetectionTags, error)
}

type taskAdder interface {
	Add(ctx context.Context, tasks []models.AnalysisTask) error
}

type SourceToolkit interface {
	Analyze(ctx context.Context, postID string, profileSettings models.ProfileSettings) (models.Detection, error)
	DeleteProfile(ctx context.Context, profileID int64) error
	GetSourcePosts(ctx context.Context, ids []string) ([]models.SourcePost, error)
	// GetSourceIDsForAnalysis returns a list of source IDs for analysis.
	//
	// profileIDs - profiles for which to get source IDs
	//
	// days - how many days to go back in time to analyze
	//
	// limit - how many posts to analyze. If -1, analyze all posts.
	GetScheduledSourceIDs(ctx context.Context, profileIDs []int64, days int, limit int) ([]string, error)
}

type Scout struct {
	toolkits  map[string]SourceToolkit
	storage   storage
	taskAdder taskAdder
	logger    zerolog.Logger
}

func New(
	toolkits map[string]SourceToolkit,
	storage storage,
	taskAdder taskAdder,
	logger zerolog.Logger,
) *Scout {
	return &Scout{
		toolkits:  toolkits,
		storage:   storage,
		taskAdder: taskAdder,
		logger:    logger,
	}
}

func (s *Scout) Analyze(ctx context.Context, source string, sourceID string, profileSettings models.ProfileSettings, shouldSave bool) (models.Detection, error) {
	logger := s.logger.With().Str("source", source).Str("source_id", sourceID).Logger()

	toolkit, ok := s.toolkits[source]
	if !ok {
		return models.Detection{}, fmt.Errorf("toolkit not found: %s", sourceID)
	}

	// Analyze post
	detection, err := toolkit.Analyze(ctx, sourceID, profileSettings)
	if err != nil {
		return models.Detection{}, fmt.Errorf("analysis failed for profile '%d': %w", profileSettings.ProfileID, err)
	}

	if shouldSave {
		// Save detection to database
		record := models.DetectionRecord{
			Source:     source,
			SourceID:   sourceID,
			ProfileID:  profileSettings.ProfileID,
			IsRelevant: detection.IsRelevant,
			Properties: detection.Properties,
		}

		if err := s.storage.SaveDetection(ctx, record); err != nil {
			logger.Error().Err(err).Msg("failed to save post")

			return models.Detection{}, fmt.Errorf("save report: %w", err)
		}
	}

	return detection, nil
}

func (s *Scout) ScheduleAnalysis(ctx context.Context, tasks []models.AnalysisTask) error {
	return s.taskAdder.Add(ctx, tasks)
}

func (s *Scout) DeleteProfile(ctx context.Context, id int64) error {
	if err := s.storage.DeleteProfileByID(ctx, id); err != nil {
		return fmt.Errorf("delete profile from storage: %w", err)
	}

	for source, toolkit := range s.toolkits {
		if err := toolkit.DeleteProfile(ctx, id); err != nil {
			return fmt.Errorf("delete profile from source toolkit (source=%s): %w", source, err)
		}
	}

	return nil
}

func (s *Scout) GetAllProfiles(ctx context.Context) ([]models.Profile, error) {
	return s.storage.GetAllProfiles(ctx)
}

func (s *Scout) GetProfile(ctx context.Context, id int64) (profile models.Profile, found bool, err error) {
	return s.storage.GetProfile(ctx, id)
}

func (s *Scout) CreateProfile(ctx context.Context, profile models.Profile) (id int64, err error) {
	return s.storage.CreateProfile(ctx, profile)
}

func (s *Scout) UpdateProfile(ctx context.Context, update models.ProfileUpdate) error {
	return s.storage.UpdateProfile(ctx, update)
}

func (s *Scout) UpdateTags(ctx context.Context, detectionID int64, update models.DetectionTagsUpdate) (models.DetectionTags, error) {
	return s.storage.UpdateTags(ctx, detectionID, update)
}

func (s *Scout) GetDetectionTags(ctx context.Context, detectionIDs []int64) ([]models.DetectionTags, error) {
	return s.storage.GetDetectionTags(ctx, detectionIDs)
}

func (s *Scout) GetSourcePosts(ctx context.Context, source string, sourceIDs []string) ([]models.SourcePost, error) {
	toolkit, ok := s.toolkits[source]
	if !ok {
		return nil, fmt.Errorf("toolkit not found: %s", source)
	}

	posts, err := toolkit.GetSourcePosts(ctx, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("get source posts: %w", err)
	}

	return posts, nil
}

func (s *Scout) ListDetections(ctx context.Context, query models.DetectionQuery) ([]models.DetectionRecord, error) {
	return s.storage.ListDetections(ctx, query)
}

func (s *Scout) JumpstartProfile(ctx context.Context, profileID int64, jumpstartPeriod int, limit int) error {
	var analysisTasks []models.AnalysisTask

	for source, toolkit := range s.toolkits {
		sourceIDs, err := toolkit.GetScheduledSourceIDs(ctx, []int64{profileID}, jumpstartPeriod, limit)
		if err != nil {
			return fmt.Errorf("get source IDs for analysis (source=%s): %w", source, err)
		}

		for _, sourceID := range sourceIDs {
			analysisTasks = append(analysisTasks, models.AnalysisTask{
				Source:     source,
				SourceID:   sourceID,
				ProfileID:  profileID,
				ShouldSave: true,
			})
		}
	}

	if err := s.taskAdder.Add(ctx, analysisTasks); err != nil {
		return fmt.Errorf("add analysis tasks: %w", err)
	}

	return nil
}
