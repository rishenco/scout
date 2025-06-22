package pg

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/samber/lo"

	"github.com/rishenco/scout/internal/tools"
	"github.com/rishenco/scout/pkg/models"
)

type ScoutStorage struct {
	pool   *pgxpool.Pool
	logger zerolog.Logger
}

func NewScoutStorage(pool *pgxpool.Pool, logger zerolog.Logger) *ScoutStorage {
	return &ScoutStorage{
		pool:   pool,
		logger: logger,
	}
}

func (s *ScoutStorage) SaveDetection(ctx context.Context, record models.DetectionRecord) error {
	query := `
		INSERT INTO scout.detections (source, source_id, profile_id, settings_version, is_relevant, properties)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := s.pool.Exec(
		ctx,
		query,
		record.Source,
		record.SourceID,
		record.ProfileID,
		record.SettingsVersion,
		record.IsRelevant,
		record.Properties,
	)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *ScoutStorage) GetProfile(
	ctx context.Context,
	profileID int64,
) (profile models.Profile, found bool, err error) {
	getProfileQuery := `
		SELECT p.id, p.name, p.active, p.created_at, p.updated_at
		FROM scout.profiles p
		WHERE p.id = $1
	`

	getProfileSettingsQuery := `
		SELECT ps.source, ps.profile_id, ps.version, ps.relevancy_filter, ps.extracted_properties, ps.created_at, ps.updated_at
		FROM scout.profile_settings ps
		WHERE ps.profile_id = $1
	`

	profileRow := s.pool.QueryRow(ctx, getProfileQuery, profileID)

	if err := profileRow.Scan(&profile.ID, &profile.Name, &profile.Active, &profile.CreatedAt, &profile.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Profile{}, false, nil
		}

		return models.Profile{}, false, fmt.Errorf("scan: %w", err)
	}

	settingsRows, err := s.pool.Query(ctx, getProfileSettingsQuery, profileID)
	if err != nil {
		return models.Profile{}, false, fmt.Errorf("query: %w", err)
	}

	defer settingsRows.Close()

	for settingsRows.Next() {
		var source *string
		var settings models.ProfileSettings

		err := settingsRows.Scan(
			&source,
			&settings.ProfileID,
			&settings.Version,
			&settings.RelevancyFilter,
			&settings.ExtractedProperties,
			&settings.CreatedAt,
			&settings.UpdatedAt,
		)
		if err != nil {
			return models.Profile{}, false, fmt.Errorf("scan: %w", err)
		}

		if source == nil {
			profile.DefaultSettings = &settings

			continue
		}

		if profile.SourcesSettings == nil {
			profile.SourcesSettings = make(map[string]models.ProfileSettings)
		}

		profile.SourcesSettings[*source] = settings
	}

	return profile, true, nil
}

func (s *ScoutStorage) GetAllProfiles(ctx context.Context) ([]models.Profile, error) {
	getProfilesQuery := `
		SELECT p.id, p.name, p.active, p.created_at, p.updated_at
		FROM scout.profiles p
	`

	getProfileSettingsQuery := `
		SELECT ps.profile_id, ps.source, ps.version, ps.relevancy_filter, ps.extracted_properties, ps.created_at, ps.updated_at
		FROM scout.profile_settings ps
	`

	profilesRows, err := s.pool.Query(ctx, getProfilesQuery)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer profilesRows.Close()

	profiles := make(map[int64]models.Profile)

	for profilesRows.Next() {
		var profile models.Profile

		if err := profilesRows.Scan(&profile.ID, &profile.Name, &profile.Active, &profile.CreatedAt, &profile.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		profiles[profile.ID] = profile
	}

	if err := profilesRows.Err(); err != nil {
		return nil, fmt.Errorf("rows: %w", err)
	}

	settingsRows, err := s.pool.Query(ctx, getProfileSettingsQuery)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer settingsRows.Close()

	for settingsRows.Next() {
		var source *string
		var settings models.ProfileSettings

		err := settingsRows.Scan(
			&settings.ProfileID,
			&source,
			&settings.Version,
			&settings.RelevancyFilter,
			&settings.ExtractedProperties,
			&settings.CreatedAt,
			&settings.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		profile, ok := profiles[settings.ProfileID]
		if !ok {
			s.logger.Error().Int64("profile_id", settings.ProfileID).Msg("profile not found")

			continue
		}

		if source == nil {
			profile.DefaultSettings = &settings
		} else {
			if profile.SourcesSettings == nil {
				profile.SourcesSettings = make(map[string]models.ProfileSettings)
			}

			profile.SourcesSettings[*source] = settings
		}

		profiles[settings.ProfileID] = profile
	}

	if err := settingsRows.Err(); err != nil {
		return nil, fmt.Errorf("rows: %w", err)
	}

	return lo.Values(profiles), nil
}

func (s *ScoutStorage) DeleteProfileByID(ctx context.Context, id int64) error {
	query := `
		DELETE FROM scout.profiles p
		WHERE p.id = $1
	`

	_, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *ScoutStorage) CreateProfile(ctx context.Context, profile models.Profile) (profileID int64, err error) {
	createProfileQuery := `
		INSERT INTO scout.profiles (name, active, created_at, updated_at)
		VALUES ($1, $2, NOW(), NOW())
		RETURNING id
	`

	createSettingsQuery := `
		INSERT INTO scout.profile_settings (profile_id, source, relevancy_filter, extracted_properties, created_at, updated_at)
		VALUES ($1, $2, $3, $4, NOW(), NOW())
	`

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin tx: %w", err)
	}

	defer func() {
		rollbackErr := tx.Rollback(ctx)

		if rollbackErr == nil {
			return
		}

		s.logger.Error().Err(rollbackErr).Msg("failed to rollback tx")
	}()

	createProfileRow := tx.QueryRow(ctx, createProfileQuery, profile.Name, profile.Active)
	if err := createProfileRow.Scan(&profileID); err != nil {
		return 0, fmt.Errorf("scan: %w", err)
	}

	if profile.DefaultSettings != nil {
		extractedPropertiesJSON, err := json.Marshal(profile.DefaultSettings.ExtractedProperties)
		if err != nil {
			return 0, fmt.Errorf("marshal default settings extracted properties: %w", err)
		}

		_, err = tx.Exec(
			ctx,
			createSettingsQuery,
			profileID,
			nil,
			profile.DefaultSettings.RelevancyFilter,
			extractedPropertiesJSON,
		)
		if err != nil {
			return 0, fmt.Errorf("insert default settings: %w", err)
		}
	}

	for source, settings := range profile.SourcesSettings {
		extractedPropertiesJSON, err := json.Marshal(settings.ExtractedProperties)
		if err != nil {
			return 0, fmt.Errorf("marshal source settings extracted properties: %w", err)
		}

		_, err = tx.Exec(
			ctx,
			createSettingsQuery,
			profileID,
			source,
			settings.RelevancyFilter,
			extractedPropertiesJSON,
		)
		if err != nil {
			return 0, fmt.Errorf("insert source settings: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return profileID, nil
}

//nolint:gocognit,funlen // TODO: refactor
func (s *ScoutStorage) UpdateProfile(ctx context.Context, update models.ProfileUpdate) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	defer func() {
		rollbackErr := tx.Rollback(ctx)

		if rollbackErr == nil || errors.Is(rollbackErr, pgx.ErrTxClosed) {
			return
		}

		s.logger.Error().Err(rollbackErr).Msg("failed to rollback tx")
	}()

	// Updating profile

	updateProfileSb := tools.Psq().
		Update("scout.profiles").
		Where(sq.Eq{"id": update.ProfileID}).
		Set("updated_at", sq.Expr("NOW()"))

	if update.Name != nil && len(*update.Name) > 0 {
		updateProfileSb = updateProfileSb.Set("name", *update.Name)
	}

	if update.Active != nil {
		updateProfileSb = updateProfileSb.Set("active", *update.Active)
	}

	updateProfileSQL, updateProfileArgs, err := updateProfileSb.ToSql()
	if err != nil {
		return fmt.Errorf("updateProfileSb to sql: %w", err)
	}

	_, err = tx.Exec(ctx, updateProfileSQL, updateProfileArgs...)
	if err != nil {
		return fmt.Errorf("update scout.profiles: %w", err)
	}

	// (source) => (settings update, if nil delete else update)
	sourceSettingsUpdates := make(map[*string]*models.ProfileSettingsUpdate)

	if update.DefaultSettings.IsSet() {
		sourceSettingsUpdates[nil] = update.DefaultSettings.Value
	}

	for source, settings := range update.SourcesSettings {
		sourceSettingsUpdates[&source] = settings
	}

	for source, settingsUpdate := range sourceSettingsUpdates {
		if settingsUpdate == nil {
			// Delete settings
			sb := tools.Psq().
				Delete("scout.profile_settings").
				Where(sq.Eq{"profile_id": update.ProfileID}).
				Where(sq.Eq{"source": source})

			deleteSettingsSQL, deleteSettingsArgs, err := sb.ToSql()
			if err != nil {
				return fmt.Errorf("deleteSettingsSb to sql: %w", err)
			}

			_, err = tx.Exec(ctx, deleteSettingsSQL, deleteSettingsArgs...)
			if err != nil {
				return fmt.Errorf("delete scout.profile_settings: %w", err)
			}

			continue
		}

		// Update settings

		if settingsUpdate.RelevancyFilter == nil && settingsUpdate.ExtractedProperties == nil {
			// No changes
			continue
		}

		// Inserting if not exists

		insertSettingsSb := tools.Psq().
			Insert("scout.profile_settings").
			Columns("profile_id", "source", "relevancy_filter", "extracted_properties").
			Values(update.ProfileID, source, "", "{}").
			Suffix("ON CONFLICT DO NOTHING")

		insertSettingsSQL, insertSettingsArgs, err := insertSettingsSb.ToSql()
		if err != nil {
			return fmt.Errorf("insertSettingsSb to sql: %w", err)
		}

		_, err = tx.Exec(ctx, insertSettingsSQL, insertSettingsArgs...)
		if err != nil {
			return fmt.Errorf("insert scout.profile_settings: %w", err)
		}

		sb := tools.Psq().
			Update("scout.profile_settings").
			Where(sq.Eq{"profile_id": update.ProfileID}).
			Where(sq.Eq{"source": source}).
			Set("updated_at", sq.Expr("NOW()")).
			Set("version", sq.Expr("version + 1"))

		if settingsUpdate.RelevancyFilter != nil {
			sb = sb.Set("relevancy_filter", *settingsUpdate.RelevancyFilter)
		}

		if settingsUpdate.ExtractedProperties != nil {
			extractedPropertiesJSON, err := json.Marshal(settingsUpdate.ExtractedProperties)
			if err != nil {
				return fmt.Errorf("marshal extracted properties: %w", err)
			}

			sb = sb.Set("extracted_properties", extractedPropertiesJSON)
		}

		updateSettingsSQL, updateSettingsArgs, err := sb.ToSql()
		if err != nil {
			return fmt.Errorf("updateSettingsSb to sql: %w", err)
		}

		_, err = tx.Exec(ctx, updateSettingsSQL, updateSettingsArgs...)
		if err != nil {
			return fmt.Errorf("update scout.profile_settings: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

func (s *ScoutStorage) UpdateTags(
	ctx context.Context,
	detectionID int64,
	update models.DetectionTagsUpdate,
) (models.DetectionTags, error) {
	if !update.RelevancyDetectedCorrectly.IsSet() {
		return models.DetectionTags{}, nil
	}

	query := `
		INSERT INTO scout.detection_tags (detection_id, relevancy_detected_correctly)
		VALUES ($1, $2)
		ON CONFLICT (detection_id) DO UPDATE
		SET relevancy_detected_correctly = $2
		RETURNING relevancy_detected_correctly
	`

	row := s.pool.QueryRow(ctx, query, detectionID, update.RelevancyDetectedCorrectly.Value)

	var relevancyDetectedCorrectly *bool

	if err := row.Scan(&relevancyDetectedCorrectly); err != nil {
		return models.DetectionTags{}, fmt.Errorf("scan: %w", err)
	}

	return models.DetectionTags{
		RelevancyDetectedCorrectly: relevancyDetectedCorrectly,
	}, nil
}

func (s *ScoutStorage) GetDetectionTags(ctx context.Context, detectionIDs []int64) ([]models.DetectionTags, error) {
	query := `
		SELECT detection_id, relevancy_detected_correctly 
		FROM scout.detection_tags 
		WHERE detection_id = ANY($1)
	`

	rows, err := s.pool.Query(ctx, query, detectionIDs)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	result := make([]models.DetectionTags, 0)

	for rows.Next() {
		var detectionTags models.DetectionTags

		if err := rows.Scan(&detectionTags.DetectionID, &detectionTags.RelevancyDetectedCorrectly); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		result = append(result, detectionTags)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows err: %w", err)
	}

	return result, nil
}

func (s *ScoutStorage) ListDetections(
	ctx context.Context,
	query models.DetectionQuery,
) ([]models.DetectionRecord, error) {
	sb := tools.Psq().
		Select(
			"d.id",
			"d.source",
			"d.source_id",
			"d.profile_id",
			"d.is_relevant",
			"d.properties",
			"d.created_at",
		).
		From("scout.detections d").
		Limit(uint64(max(0, query.Limit))) //nolint:gosec // limit value can't overflow uint64

	switch query.Order {
	case models.DetectionOrderAsc:
		sb = sb.OrderBy("d.id ASC")

		if query.LastSeenID != nil {
			sb = sb.Where(sq.Gt{"d.id": *query.LastSeenID})
		}
	case models.DetectionOrderDesc:
		sb = sb.OrderBy("d.id DESC")

		if query.LastSeenID != nil {
			sb = sb.Where(sq.Lt{"d.id": *query.LastSeenID})
		}
	default:
		return nil, fmt.Errorf("unknown order: %s", query.Order)
	}

	if query.Filter.IsRelevant != nil {
		sb = sb.Where(sq.Eq{"d.is_relevant": *query.Filter.IsRelevant})
	}

	if query.Filter.Profiles != nil && len(*query.Filter.Profiles) > 0 {
		var profilesFilterClause sq.Or

		for _, profileFilter := range *query.Filter.Profiles {
			var profileFilterClause sq.And

			profileFilterClause = append(profileFilterClause, sq.Eq{"d.profile_id": profileFilter.ProfileID})

			if len(profileFilter.SourceSettingsVersions) > 0 {
				sourceAndVersionFilterClause := sq.Or{}

				for _, sourceVersionFilter := range profileFilter.SourceSettingsVersions {
					sourceAndVersionFilterClause = append(
						sourceAndVersionFilterClause,
						sq.Eq{
							"d.source":           sourceVersionFilter.Source,
							"d.settings_version": sourceVersionFilter.Versions,
						},
					)
				}

				profileFilterClause = append(profileFilterClause, sourceAndVersionFilterClause)
			}

			profilesFilterClause = append(profilesFilterClause, profileFilterClause)
		}

		sb = sb.Where(profilesFilterClause)
	}

	if query.Filter.Sources != nil {
		sb = sb.Where(sq.Eq{"d.source": *query.Filter.Sources})
	}

	if query.Filter.Tags.RelevancyDetectedCorrectly != nil {
		sb = sb.LeftJoin("scout.detection_tags dt ON d.id = dt.detection_id")
	}

	if query.Filter.Tags.RelevancyDetectedCorrectly != nil {
		sb = sb.Where(sq.Eq{"dt.relevancy_detected_correctly": *query.Filter.Tags.RelevancyDetectedCorrectly})
	}

	sql, args, err := sb.ToSql()
	if err != nil {
		return nil, fmt.Errorf("sb to sql: %w", err)
	}

	s.logger.Info().Str("sql", sql).Interface("args", args).Msg("list detections")

	rows, err := s.pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	result := make([]models.DetectionRecord, 0)

	for rows.Next() {
		var detection models.DetectionRecord

		err := rows.Scan(
			&detection.ID,
			&detection.Source,
			&detection.SourceID,
			&detection.ProfileID,
			&detection.IsRelevant,
			&detection.Properties,
			&detection.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		result = append(result, detection)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows err: %w", err)
	}

	return result, nil
}

func (s *ScoutStorage) GetPresentDetectionsForProfile(
	ctx context.Context,
	profileID int64,
	source string,
	sourceIDs []string,
) ([]string, error) {
	query := `
		SELECT DISTINCT source_id
		FROM scout.detections
		WHERE profile_id = $1 AND source = $2 AND source_id = ANY($3)
	`

	rows, err := s.pool.Query(ctx, query, profileID, source, sourceIDs)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	result := make([]string, 0)

	for rows.Next() {
		var sourceID string

		if err := rows.Scan(&sourceID); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		result = append(result, sourceID)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows err: %w", err)
	}

	return result, nil
}
