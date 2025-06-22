package scout

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/samber/lo"

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
	GetPresentDetectionsForProfile(
		ctx context.Context,
		profileID int64,
		source string,
		sourceIDs []string,
	) ([]string, error)
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
	// days - how many days to go back in time to analyze. If nil, analyze all posts.
	//
	// limit - how many posts to analyze. If nil, analyze all posts.
	GetScheduledSourceIDs(ctx context.Context, profileIDs []int64, days *int, limit *int) ([]string, error)
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

func (s *Scout) Analyze(
	ctx context.Context,
	source string,
	sourceID string,
	profileSettings models.ProfileSettings,
	shouldSave bool,
) (models.Detection, error) {
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
			Source:          source,
			SourceID:        sourceID,
			ProfileID:       profileSettings.ProfileID,
			SettingsVersion: profileSettings.Version,
			IsRelevant:      detection.IsRelevant,
			Properties:      detection.Properties,
		}

		if err := s.storage.SaveDetection(ctx, record); err != nil {
			logger.Error().Err(err).Msg("failed to save post")

			return models.Detection{}, fmt.Errorf("save report: %w", err)
		}
	}

	return detection, nil
}

// ScheduleAnalysis adds tasks to the task queue.
func (s *Scout) ScheduleAnalysis(ctx context.Context, tasks []models.AnalysisTask) error {
	for i := range tasks {
		task := &tasks[i]

		if task.Type == "" {
			task.Type = models.ScheduledTaskType
		}
	}

	if err := s.taskAdder.Add(ctx, tasks); err != nil {
		return fmt.Errorf("add tasks: %w", err)
	}

	s.logger.Info().
		Int("tasks_count", len(tasks)).
		Msg("scheduled tasks")

	return nil
}

// DeleteProfile deletes a given profile from the scout's storage and notifies all sources that the profile has been deleted.
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

// GetAllProfiles returns all profiles from the scout's storage.
func (s *Scout) GetAllProfiles(ctx context.Context) ([]models.Profile, error) {
	return s.storage.GetAllProfiles(ctx)
}

// GetProfile returns a profile from the scout's storage by its ID.
func (s *Scout) GetProfile(ctx context.Context, id int64) (profile models.Profile, found bool, err error) {
	return s.storage.GetProfile(ctx, id)
}

// CreateProfile creates a new profile in the scout's storage.
func (s *Scout) CreateProfile(ctx context.Context, profile models.Profile) (id int64, err error) {
	return s.storage.CreateProfile(ctx, profile)
}

// UpdateProfile partially updates a profile in the scout's storage.
func (s *Scout) UpdateProfile(ctx context.Context, update models.ProfileUpdate) error {
	return s.storage.UpdateProfile(ctx, update)
}

// UpdateTags updates the tags for a given detection.
func (s *Scout) UpdateTags(
	ctx context.Context,
	detectionID int64,
	update models.DetectionTagsUpdate,
) (models.DetectionTags, error) {
	return s.storage.UpdateTags(ctx, detectionID, update)
}

// GetDetectionTags returns the tags for a given detection.
func (s *Scout) GetDetectionTags(ctx context.Context, detectionIDs []int64) ([]models.DetectionTags, error) {
	return s.storage.GetDetectionTags(ctx, detectionIDs)
}

// GetSourcePosts returns the posts for a given source and source IDs.
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

// ListDetections returns a list of detections from the scout's storage.
func (s *Scout) ListDetections(ctx context.Context, query models.DetectionQuery) ([]models.DetectionRecord, error) {
	return s.storage.ListDetections(ctx, query)
}

// JumpstartProfile schedules a jumpstart analysis for a given profile.
//
// Jumpstart Algorithm:
//
// 1. Load all previously scheduled post ids from all sources (within period/limit constraints)
//
// 2. Filter out posts that have already been analyzed with the given profile
//
// 3. Add remaining posts to the task queue
//
// Usage example: start this process after adding new subreddits / creating a new profile.
func (s *Scout) JumpstartProfile(
	ctx context.Context,
	profileID int64,
	excludeAlreadyAnalyzed bool,
	jumpstartPeriod *int,
	limit *int,
) error {
	analysisTaskParameters, err := s.DryJumpstartProfile(ctx, profileID, excludeAlreadyAnalyzed, jumpstartPeriod, limit)
	if err != nil {
		return fmt.Errorf("dry jumpstart profile: %w", err)
	}

	analysisTasks := lo.Map(analysisTaskParameters, func(taskParameters models.AnalysisParameters, _ int) models.AnalysisTask {
		return models.AnalysisTask{
			Type:       models.ManualTaskType,
			Parameters: taskParameters,
		}
	})

	if err := s.taskAdder.Add(ctx, analysisTasks); err != nil {
		return fmt.Errorf("add analysis tasks: %w", err)
	}

	s.logger.Info().
		Int64("profile_id", profileID).
		Int("tasks_count", len(analysisTasks)).
		Msg("scheduled tasks for profile jumpstart")

	return nil
}

func (s *Scout) DryJumpstartProfile(
	ctx context.Context,
	profileID int64,
	excludeAlreadyAnalyzed bool,
	jumpstartPeriod *int,
	limit *int,
) (taskParameters []models.AnalysisParameters, err error) {
	sourceToIDs := make(map[string][]string)

	for source, toolkit := range s.toolkits {
		sourceIDs, err := toolkit.GetScheduledSourceIDs(ctx, []int64{profileID}, jumpstartPeriod, limit)
		if err != nil {
			return nil, fmt.Errorf("get source IDs for analysis (source=%s): %w", source, err)
		}

		sourceToIDs[source] = sourceIDs
	}

	for source, sourceIDs := range sourceToIDs {
		if excludeAlreadyAnalyzed {
			presentSourceIDs, err := s.storage.GetPresentDetectionsForProfile(ctx, profileID, source, sourceIDs)
			if err != nil {
				return nil, fmt.Errorf("get present detections (source=%s): %w", source, err)
			}

			presentSourceIDsSet := make(map[string]struct{})
			for _, id := range presentSourceIDs {
				presentSourceIDsSet[id] = struct{}{}
			}

			sourceIDs = lo.Filter(sourceIDs, func(id string, _ int) bool {
				_, ok := presentSourceIDsSet[id]

				return !ok
			})
		}

		for _, sourceID := range sourceIDs {
			taskParameters = append(taskParameters, models.AnalysisParameters{
				Source:     source,
				SourceID:   sourceID,
				ProfileID:  profileID,
				ShouldSave: true,
			})
		}
	}

	return taskParameters, nil
}
