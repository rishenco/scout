package api

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	oapinullable "github.com/oapi-codegen/nullable"
	"github.com/rs/zerolog"

	"github.com/rishenco/scout/api/oapi"
	"github.com/rishenco/scout/internal/sources/reddit"
	"github.com/rishenco/scout/pkg/models"
	"github.com/rishenco/scout/pkg/nullable"
	"github.com/samber/lo"
)

type scout interface {
	Analyze(ctx context.Context, source string, sourceID string, profileSettings models.ProfileSettings, shouldSave bool) (models.Detection, error)
	DeleteProfileByID(ctx context.Context, id int64) error
	GetAllProfiles(ctx context.Context) ([]models.Profile, error)
	GetProfile(ctx context.Context, id int64) (profile models.Profile, found bool, err error)
	CreateProfile(ctx context.Context, profile models.Profile) (id int64, err error)
	UpdateProfile(ctx context.Context, update models.ProfileUpdate) error
	UpdateTags(ctx context.Context, detectionID int64, update models.DetectionTagsUpdate) error
	GetDetectionTags(ctx context.Context, detectionIDs []int64) ([]models.DetectionTags, error)
	GetSourcePosts(ctx context.Context, source string, sourceIDs []string) ([]models.SourcePost, error)
	ListDetections(ctx context.Context, query models.DetectionQuery) ([]models.DetectionRecord, error)
}

type redditToolkit interface {
	GetAllSubredditSettings(ctx context.Context) ([]reddit.SubredditSettings, error)
	GetAllSubredditSettingsWithProfileID(ctx context.Context, profileID int64) ([]reddit.SubredditSettings, error)
	AddProfilesToSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error
	RemoveProfilesFromSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error
}

var _ oapi.StrictServerInterface = &Server{}

type Server struct {
	scout         scout
	redditToolkit redditToolkit

	logger zerolog.Logger
}

func NewServer(scout scout, redditToolkit redditToolkit, logger zerolog.Logger) *Server {
	return &Server{
		scout:         scout,
		redditToolkit: redditToolkit,
		logger:        logger,
	}
}

func NewGinEngine(server *Server, middlewares ...gin.HandlerFunc) *gin.Engine {
	ginEngine := gin.New()

	strictHandler := oapi.NewStrictHandler(server, nil)

	ginEngine.Use(middlewares...)

	oapi.RegisterHandlers(ginEngine, strictHandler)

	return ginEngine
}

// DeleteApiProfilesId implements oapi.StrictServerInterface.
func (s *Server) DeleteApiProfilesId(ctx context.Context, request oapi.DeleteApiProfilesIdRequestObject) (oapi.DeleteApiProfilesIdResponseObject, error) {
	if err := s.scout.DeleteProfileByID(ctx, int64(request.Id)); err != nil {
		return oapi.DeleteApiProfilesId500JSONResponse{Error: err.Error()}, nil
	}

	return oapi.DeleteApiProfilesId204Response{}, nil
}

// GetApiProfiles implements oapi.StrictServerInterface.
func (s *Server) GetApiProfiles(ctx context.Context, request oapi.GetApiProfilesRequestObject) (oapi.GetApiProfilesResponseObject, error) {
	profiles, err := s.scout.GetAllProfiles(ctx)
	if err != nil {
		return oapi.GetApiProfiles500JSONResponse{Error: err.Error()}, nil
	}

	oapiApiProfiles := make([]oapi.Profile, 0, len(profiles))

	for _, profile := range profiles {
		oapiApiProfiles = append(oapiApiProfiles, profileFromModel(profile))
	}

	return oapi.GetApiProfiles200JSONResponse(oapiApiProfiles), nil
}

// GetApiProfilesId implements oapi.StrictServerInterface.
func (s *Server) GetApiProfilesId(ctx context.Context, request oapi.GetApiProfilesIdRequestObject) (oapi.GetApiProfilesIdResponseObject, error) {
	profile, found, err := s.scout.GetProfile(ctx, int64(request.Id))
	if err != nil {
		return oapi.GetApiProfilesId500JSONResponse{Error: err.Error()}, nil
	}

	if !found {
		return oapi.GetApiProfilesId404Response{}, nil
	}

	return oapi.GetApiProfilesId200JSONResponse(profileFromModel(profile)), nil
}

// GetApiSourcesRedditSubreddits implements oapi.StrictServerInterface.
func (s *Server) GetApiSourcesRedditSubreddits(ctx context.Context, request oapi.GetApiSourcesRedditSubredditsRequestObject) (oapi.GetApiSourcesRedditSubredditsResponseObject, error) {
	allSubredditSettings, err := s.redditToolkit.GetAllSubredditSettings(ctx)
	if err != nil {
		return oapi.GetApiSourcesRedditSubreddits500JSONResponse{Error: err.Error()}, nil
	}

	oapiSubredditSettings := make([]oapi.SubredditSettings, 0, len(allSubredditSettings))

	for _, subredditSettings := range allSubredditSettings {
		oapiSubredditSettings = append(oapiSubredditSettings, subredditSettingsFromModel(subredditSettings))
	}

	return oapi.GetApiSourcesRedditSubreddits200JSONResponse(oapiSubredditSettings), nil
}

// GetApiSourcesRedditSubredditsWithProfile implements oapi.StrictServerInterface.
func (s *Server) GetApiSourcesRedditSubredditsWithProfile(ctx context.Context, request oapi.GetApiSourcesRedditSubredditsWithProfileRequestObject) (oapi.GetApiSourcesRedditSubredditsWithProfileResponseObject, error) {
	subredditSettings, err := s.redditToolkit.GetAllSubredditSettingsWithProfileID(ctx, int64(request.Params.ProfileId))
	if err != nil {
		return oapi.GetApiSourcesRedditSubredditsWithProfile500JSONResponse{Error: err.Error()}, nil
	}

	oapiSubredditSettings := make([]oapi.SubredditSettings, 0, len(subredditSettings))

	for _, subredditSettings := range subredditSettings {
		oapiSubredditSettings = append(oapiSubredditSettings, subredditSettingsFromModel(subredditSettings))
	}

	return oapi.GetApiSourcesRedditSubredditsWithProfile200JSONResponse(oapiSubredditSettings), nil
}

// PostAnalyze implements oapi.StrictServerInterface.
func (s *Server) PostApiAnalyze(ctx context.Context, request oapi.PostApiAnalyzeRequestObject) (oapi.PostApiAnalyzeResponseObject, error) {
	detection, err := s.scout.Analyze(
		ctx,
		request.Body.Source,
		request.Body.SourceId,
		models.ProfileSettings{
			ProfileID:           -1,
			RelevancyFilter:     request.Body.RelevancyFilter,
			ExtractedProperties: request.Body.ExtractedProperties,
		},
		// Do not save the detection
		false,
	)
	if err != nil {
		return oapi.PostApiAnalyze500JSONResponse{Error: err.Error()}, nil
	}

	return oapi.PostApiAnalyze200JSONResponse(detectionFromModel(detection)), nil
}

// PostApiDetectionsList implements oapi.StrictServerInterface.
func (s *Server) PostApiDetectionsList(ctx context.Context, request oapi.PostApiDetectionsListRequestObject) (oapi.PostApiDetectionsListResponseObject, error) {
	query := detectionQueryFromOapi(*request.Body)

	query.Order = models.DetectionOrderDesc

	detections, err := s.scout.ListDetections(ctx, query)
	if err != nil {
		return oapi.PostApiDetectionsList500JSONResponse{Error: err.Error()}, nil
	}

	sourceToIDs := make(map[string][]string)
	detectionIDs := make([]int64, 0, len(detections))

	for _, detection := range detections {
		sourceToIDs[detection.Source] = append(sourceToIDs[detection.Source], detection.SourceID)
		detectionIDs = append(detectionIDs, detection.ID)
	}

	// source -> sourceID -> post
	sourceToPosts := make(map[string]map[string]models.SourcePost)

	for source, sourceIDs := range sourceToIDs {
		sourcePosts, err := s.scout.GetSourcePosts(ctx, source, sourceIDs)
		if err != nil {
			return oapi.PostApiDetectionsList500JSONResponse{Error: err.Error()}, nil
		}

		sourceToPosts[source] = make(map[string]models.SourcePost)

		for _, post := range sourcePosts {
			sourceToPosts[source][post.SourceID] = post
		}
	}

	detectionTags, err := s.scout.GetDetectionTags(ctx, detectionIDs)
	if err != nil {
		return oapi.PostApiDetectionsList500JSONResponse{Error: err.Error()}, nil
	}

	detectionTagsIndex := make(map[int64]models.DetectionTags)

	for _, detectionTag := range detectionTags {
		detectionTagsIndex[detectionTag.DetectionID] = detectionTag
	}

	result := make([]oapi.ListedDetection, 0, len(detections))

	for _, detection := range detections {
		oapiDetection := oapi.ListedDetection{
			Detection: &oapi.Detection{
				CreatedAt:  detection.CreatedAt.Format(time.RFC3339),
				Id:         int(detection.ID),
				IsRelevant: detection.IsRelevant,
				ProfileId:  int(detection.ProfileID),
				Properties: detection.Properties,
				Source:     detection.Source,
				SourceId:   detection.SourceID,
			},
			SourcePost: nil,
			Tags:       nil,
		}

		if post, ok := sourceToPosts[detection.Source][detection.SourceID]; ok {
			oapiDetection.SourcePost = &post.Post
		}

		if tags, ok := detectionTagsIndex[detection.ID]; ok {
			oapiDetection.Tags = &oapi.DetectionTags{
				RelevancyDetectedCorrectly: tags.RelevancyDetectedCorrectly,
			}
		}

		result = append(result, oapiDetection)
	}

	return oapi.PostApiDetectionsList200JSONResponse(result), nil
}

// PutApiDetectionsTags implements oapi.StrictServerInterface.
func (s *Server) PutApiDetectionsTags(ctx context.Context, request oapi.PutApiDetectionsTagsRequestObject) (oapi.PutApiDetectionsTagsResponseObject, error) {
	err := s.scout.UpdateTags(
		ctx,
		int64(request.Body.DetectionId),
		models.DetectionTagsUpdate{
			DetectionID:                int64(request.Body.DetectionId),
			RelevancyDetectedCorrectly: nullableFromOapi(request.Body.Tags.RelevancyDetectedCorrectly),
		},
	)
	if err != nil {
		return oapi.PutApiDetectionsTags500JSONResponse{Error: err.Error()}, nil
	}

	return oapi.PutApiDetectionsTags204Response{}, nil
}

// PostApiProfiles implements oapi.StrictServerInterface.
func (s *Server) PostApiProfiles(ctx context.Context, request oapi.PostApiProfilesRequestObject) (oapi.PostApiProfilesResponseObject, error) {
	id, err := s.scout.CreateProfile(ctx, profileFromOapi(*request.Body))
	if err != nil {
		return oapi.PostApiProfiles500JSONResponse{Error: err.Error()}, nil
	}

	return oapi.PostApiProfiles201JSONResponse{Id: int(id)}, nil
}

// PutApiProfilesId implements oapi.StrictServerInterface.
func (s *Server) PutApiProfilesId(ctx context.Context, request oapi.PutApiProfilesIdRequestObject) (oapi.PutApiProfilesIdResponseObject, error) {
	s.logger.Info().Interface("request", request).Msg("put api profiles id")

	update := profileUpdateFromOapi(int64(request.Id), *request.Body)

	err := s.scout.UpdateProfile(ctx, update)
	if err != nil {
		return oapi.PutApiProfilesId500JSONResponse{Error: err.Error()}, nil
	}

	return oapi.PutApiProfilesId200Response{}, nil
}

// PostApiSourcesRedditSubredditsSubredditAddApiProfiles implements oapi.StrictServerInterface.
func (s *Server) PostApiSourcesRedditSubredditsSubredditAddProfiles(ctx context.Context, request oapi.PostApiSourcesRedditSubredditsSubredditAddProfilesRequestObject) (oapi.PostApiSourcesRedditSubredditsSubredditAddProfilesResponseObject, error) {
	ids := lo.Map(request.Body.ProfileIds, func(id int, _ int) int64 { return int64(id) })

	err := s.redditToolkit.AddProfilesToSubreddit(ctx, request.Subreddit, ids)
	if err != nil {
		return oapi.PostApiSourcesRedditSubredditsSubredditAddProfiles500JSONResponse{Error: err.Error()}, nil
	}

	return oapi.PostApiSourcesRedditSubredditsSubredditAddProfiles204Response{}, nil
}

// PostApiSourcesRedditSubredditsSubredditRemoveApiProfiles implements oapi.StrictServerInterface.
func (s *Server) PostApiSourcesRedditSubredditsSubredditRemoveProfiles(ctx context.Context, request oapi.PostApiSourcesRedditSubredditsSubredditRemoveProfilesRequestObject) (oapi.PostApiSourcesRedditSubredditsSubredditRemoveProfilesResponseObject, error) {
	ids := lo.Map(request.Body.ProfileIds, func(id int, _ int) int64 { return int64(id) })

	err := s.redditToolkit.RemoveProfilesFromSubreddit(ctx, request.Subreddit, ids)
	if err != nil {
		return oapi.PostApiSourcesRedditSubredditsSubredditRemoveProfiles500JSONResponse{Error: err.Error()}, nil
	}

	return oapi.PostApiSourcesRedditSubredditsSubredditRemoveProfiles204Response{}, nil
}

func profileFromModel(profile models.Profile) oapi.Profile {
	oapiProfile := oapi.Profile{
		CreatedAt:       profile.CreatedAt.Format(time.RFC3339),
		Id:              int(profile.ID),
		Name:            profile.Name,
		DefaultSettings: nil,
		SourcesSettings: &map[string]oapi.ProfileSettings{},
		UpdatedAt:       profile.UpdatedAt.Format(time.RFC3339),
	}

	if profile.DefaultSettings != nil {
		oapiProfile.DefaultSettings = lo.ToPtr(profileSettingsFromModel(*profile.DefaultSettings))
	}

	for source, settings := range profile.SourcesSettings {
		(*oapiProfile.SourcesSettings)[source] = profileSettingsFromModel(settings)
	}
	return oapiProfile
}

func profileSettingsFromModel(settings models.ProfileSettings) oapi.ProfileSettings {
	return oapi.ProfileSettings{
		ExtractedProperties: settings.ExtractedProperties,
		RelevancyFilter:     settings.RelevancyFilter,
		CreatedAt:           settings.CreatedAt.Format(time.RFC3339),
		UpdatedAt:           settings.UpdatedAt.Format(time.RFC3339),
	}
}

func subredditSettingsFromModel(settings reddit.SubredditSettings) oapi.SubredditSettings {
	return oapi.SubredditSettings{
		Subreddit: settings.Subreddit,
		Profiles:  lo.Map(settings.Profiles, func(id int64, _ int) int { return int(id) }),
	}
}

func detectionFromModel(detection models.Detection) oapi.Detection {
	return oapi.Detection{
		IsRelevant: detection.IsRelevant,
		Properties: detection.Properties,
	}
}

func profileFromOapi(profile oapi.Profile) models.Profile {
	modelProfile := models.Profile{
		ID:              int64(profile.Id),
		Name:            profile.Name,
		DefaultSettings: nil,
		SourcesSettings: map[string]models.ProfileSettings{},
	}

	if profile.DefaultSettings != nil {
		modelProfile.DefaultSettings = lo.ToPtr(profileSettingsFromOapi(*profile.DefaultSettings))
	}

	if profile.SourcesSettings != nil {
		for source, settings := range *profile.SourcesSettings {
			modelProfile.SourcesSettings[source] = profileSettingsFromOapi(settings)
		}
	}

	return modelProfile
}

func profileSettingsFromOapi(settings oapi.ProfileSettings) models.ProfileSettings {
	return models.ProfileSettings{
		ExtractedProperties: settings.ExtractedProperties,
		RelevancyFilter:     settings.RelevancyFilter,
	}
}

func profileUpdateFromOapi(profileID int64, update oapi.ProfileUpdate) models.ProfileUpdate {
	modelUpdate := models.ProfileUpdate{
		ProfileID:       profileID,
		Name:            update.Name,
		DefaultSettings: nullable.Unset[models.ProfileSettingsUpdate](),
		SourcesSettings: map[string]*models.ProfileSettingsUpdate{},
	}

	if !update.DefaultSettings.IsSpecified() {
		modelUpdate.DefaultSettings = nullable.Unset[models.ProfileSettingsUpdate]()
	} else if update.DefaultSettings.IsNull() {
		modelUpdate.DefaultSettings = nullable.Null[models.ProfileSettingsUpdate]()
	} else {
		modelUpdate.DefaultSettings = nullable.Value(profileSettingsUpdateFromOapi(update.DefaultSettings.MustGet()))
	}

	if update.SourcesSettings != nil {
		for source, settings := range *update.SourcesSettings {
			if settings == nil {
				modelUpdate.SourcesSettings[source] = nil

				continue
			}

			modelUpdate.SourcesSettings[source] = lo.ToPtr(profileSettingsUpdateFromOapi(*settings))
		}
	}

	return modelUpdate
}

func profileSettingsUpdateFromOapi(settings oapi.ProfileSettingsUpdate) models.ProfileSettingsUpdate {
	modelProfileSettingsUpdate := models.ProfileSettingsUpdate{
		RelevancyFilter:     settings.RelevancyFilter,
		ExtractedProperties: nil,
	}

	if settings.ExtractedProperties != nil {
		extractedProperties := make(map[string]string)

		for key, value := range *settings.ExtractedProperties {
			if value == nil {
				continue
			}

			extractedProperties[key] = *value
		}

		modelProfileSettingsUpdate.ExtractedProperties = &extractedProperties
	}

	return modelProfileSettingsUpdate
}

func detectionQueryFromOapi(request oapi.DetectionListRequest) models.DetectionQuery {
	query := models.DetectionQuery{
		LastSeenID: nil,
		Limit:      10,
		Filter:     &models.DetectionFilter{},
	}

	if request.LastSeenId != nil {
		query.LastSeenID = lo.ToPtr(int64(*request.LastSeenId))
	}

	if request.Limit != nil {
		query.Limit = int64(*request.Limit)
	}

	if request.Filter != nil {
		query.Filter = lo.ToPtr(detectionFilterFromOapi(*request.Filter))
	}

	return query
}

func detectionFilterFromOapi(filter oapi.DetectionFilter) models.DetectionFilter {
	modelFilter := models.DetectionFilter{
		ProfileIDs: nil,
		Sources:    filter.Sources,
		IsRelevant: filter.IsRelevant,
		Tags:       models.DetectionTagsFilter{},
	}

	if filter.Profiles != nil {
		modelFilter.ProfileIDs = lo.ToPtr(lo.Map(*filter.Profiles, func(id int, _ int) int64 { return int64(id) }))
	}

	if filter.Tags != nil {
		modelFilter.Tags = models.DetectionTagsFilter{
			RelevancyDetectedCorrectly: filter.Tags.RelevancyDetectedCorrectly,
		}
	}

	return modelFilter
}

func nullableFromOapi[T any](value oapinullable.Nullable[T]) nullable.Nullable[T] {
	if !value.IsSpecified() {
		return nullable.Unset[T]()
	}

	if value.IsNull() {
		return nullable.Null[T]()
	}

	return nullable.Value(value.MustGet())
}
