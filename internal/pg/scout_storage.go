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
		INSERT INTO scout.detections (source, source_id, profile_id, is_relevant, version, test_mode, properties)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := s.pool.Exec(
		ctx,
		query,
		record.Source,
		record.SourceID,
		record.ProfileID,
		record.IsRelevant,
		record.Version,
		record.TestMode,
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
		SELECT p.id, p.name, p.selected_version, p.created_at, p.updated_at
		FROM scout.profiles p
		WHERE p.id = $1
	`

	getProfileVersionsQuery := `
		SELECT
			version,
			test_mode,
			created_at,
			updated_at
		FROM scout.profile_versions
		WHERE profile_id = $1
	`

	getProfileSettingsQuery := `
		SELECT 
			ps.source,
			ps.version,
			ps.relevancy_filter,
			ps.extracted_properties
		FROM scout.profile_settings ps
		WHERE ps.profile_id = $1
	`

	profileRow := s.pool.QueryRow(ctx, getProfileQuery, profileID)

	if err := profileRow.Scan(&profile.ID, &profile.Name, &profile.SelectedVersion, &profile.CreatedAt, &profile.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.Profile{}, false, nil
		}

		return models.Profile{}, false, fmt.Errorf("scan: %w", err)
	}

	versionsRows, err := s.pool.Query(ctx, getProfileVersionsQuery, profileID)
	if err != nil {
		return models.Profile{}, false, fmt.Errorf("query: %w", err)
	}

	defer versionsRows.Close()

	for versionsRows.Next() {
		var version models.ProfileVersion

		if err := versionsRows.Scan(&version.Version, &version.TestMode, &version.CreatedAt, &version.UpdatedAt); err != nil {
			return models.Profile{}, false, fmt.Errorf("scan: %w", err)
		}

		profile.Versions = append(profile.Versions, version)
	}

	if err := versionsRows.Err(); err != nil {
		return models.Profile{}, false, fmt.Errorf("rows: %w", err)
	}

	settingsRows, err := s.pool.Query(ctx, getProfileSettingsQuery, profileID)
	if err != nil {
		return models.Profile{}, false, fmt.Errorf("query: %w", err)
	}

	defer settingsRows.Close()

	for settingsRows.Next() {
		var source *string
		var settings models.ProfileSettings

		if err := settingsRows.Scan(&source, &settings.Version, &settings.RelevancyFilter, &settings.ExtractedProperties); err != nil {
			return models.Profile{}, false, fmt.Errorf("scan: %w", err)
		}

		var version *models.ProfileVersion

		for _, v := range profile.Versions {
			if v.Version == settings.Version {
				version = &v

				break
			}
		}

		if version == nil {
			continue
		}

		if source == nil {
			version.DefaultSettings = &settings

			continue
		}

		if version.SourcesSettings == nil {
			version.SourcesSettings = make(map[string]models.ProfileSettings)
		}

		version.SourcesSettings[*source] = settings
	}

	return profile, true, nil
}

func (s *ScoutStorage) GetAllProfiles(ctx context.Context) ([]models.Profile, error) {
	getProfilesQuery := `
		SELECT p.id, p.name, p.selected_version, p.created_at, p.updated_at
		FROM scout.profiles p
	`

	getProfileVersionsQuery := `
		SELECT
			profile_id,
			version,
			test_mode,
			created_at,
			updated_at
		FROM scout.profile_versions
		WHERE profile_id = $1
	`

	getProfileSettingsQuery := `
		SELECT
			ps.profile_id,
			ps.version,
			ps.source,
			ps.relevancy_filter,
			ps.extracted_properties
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

		if err := profilesRows.Scan(&profile.ID, &profile.Name, &profile.SelectedVersion, &profile.CreatedAt, &profile.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		profiles[profile.ID] = profile
	}

	if err := profilesRows.Err(); err != nil {
		return nil, fmt.Errorf("rows: %w", err)
	}

	versionsRows, err := s.pool.Query(ctx, getProfileVersionsQuery)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer versionsRows.Close()

	for versionsRows.Next() {
		var profileID int64
		var version models.ProfileVersion

		if err := versionsRows.Scan(&profileID, &version.Version, &version.TestMode, &version.CreatedAt, &version.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		profile, ok := profiles[profileID]
		if !ok {
			s.logger.Error().Int64("profile_id", profileID).Msg("profile not found")

			continue
		}

		profile.Versions = append(profile.Versions, version)

		profiles[profileID] = profile
	}

	if err := versionsRows.Err(); err != nil {
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

		if err := settingsRows.Scan(&settings.ProfileID, &settings.Version, &source, &settings.RelevancyFilter, &settings.ExtractedProperties); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		profile, ok := profiles[settings.ProfileID]
		if !ok {
			s.logger.Error().Int64("profile_id", settings.ProfileID).Msg("profile not found")

			continue
		}

		var version *models.ProfileVersion

		for _, v := range profile.Versions {
			if v.Version == settings.Version {
				version = &v

				break
			}
		}

		if version == nil {
			continue
		}

		if source == nil {
			version.DefaultSettings = &settings

			continue
		} else {
			if version.SourcesSettings == nil {
				version.SourcesSettings = make(map[string]models.ProfileSettings)
			}

			version.SourcesSettings[*source] = settings
		}

		profiles[settings.ProfileID] = profile
	}

	if err := settingsRows.Err(); err != nil {
		return nil, fmt.Errorf("rows: %w", err)
	}

	return lo.Values(profiles), nil
}

func (s *ScoutStorage) DeleteProfileByID(ctx context.Context, id int64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	defer func() {
		rollbackErr := tx.Rollback(ctx)

		if rollbackErr == nil {
			return
		}

		s.logger.Error().Err(rollbackErr).Msg("failed to rollback tx")
	}()

	deleteProfileQuery := `
		DELETE FROM scout.profiles p
		WHERE p.id = $1
	`

	deleteProfileVersionsQuery := `
		DELETE FROM scout.profile_versions pv
		WHERE pv.profile_id = $1
	`

	deleteProfileSettingsQuery := `
		DELETE FROM scout.profile_settings ps
		WHERE ps.profile_id = $1
	`

	_, err = tx.Exec(ctx, deleteProfileQuery, id)
	if err != nil {
		return fmt.Errorf("delete profile: %w", err)
	}

	_, err = tx.Exec(ctx, deleteProfileVersionsQuery, id)
	if err != nil {
		return fmt.Errorf("delete profile versions: %w", err)
	}

	_, err = tx.Exec(ctx, deleteProfileSettingsQuery, id)
	if err != nil {
		return fmt.Errorf("delete profile settings: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

func (s *ScoutStorage) CreateProfile(ctx context.Context, input models.ProfileCreateInput) (profileID int64, err error) {
	createProfileQuery := `
		INSERT INTO scout.profiles (name, selected_version, created_at, updated_at)
		VALUES ($1, $2, NOW(), NOW())
		RETURNING id
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

	createProfileRow := tx.QueryRow(ctx, createProfileQuery, input.Name, input.Version.Version)
	if err := createProfileRow.Scan(&profileID); err != nil {
		return 0, fmt.Errorf("scan: %w", err)
	}

	if err := s.insertVersion(ctx, tx, profileID, input.Version); err != nil {
		return 0, fmt.Errorf("insert version: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return profileID, nil
}

func (s *ScoutStorage) insertVersion(ctx context.Context, tx pgx.Tx, profileID int64, version models.ProfileVersion) error {
	insertVersionQuery := `
		INSERT INTO scout.profile_versions (profile_id, version, test_mode, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
	`

	insertSettingsQuery := `
		INSERT INTO scout.profile_settings (profile_id, version, source, relevancy_filter, extracted_properties, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`

	_, err := tx.Exec(ctx, insertVersionQuery, profileID, version.Version, true)
	if err != nil {
		return fmt.Errorf("insert version: %w", err)
	}

	sourceToSettings := make(map[*string]models.ProfileSettings)

	if version.DefaultSettings != nil {
		sourceToSettings[nil] = *version.DefaultSettings
	}

	for source, settings := range version.SourcesSettings {
		sourceToSettings[&source] = settings
	}

	for source, settings := range sourceToSettings {
		extractedPropertiesJSON, err := json.Marshal(settings.ExtractedProperties)
		if err != nil {
			return fmt.Errorf("marshal extracted properties: %w", err)
		}

		_, err = tx.Exec(ctx, insertSettingsQuery, profileID, version.Version, source, settings.RelevancyFilter, extractedPropertiesJSON)
		if err != nil {
			return fmt.Errorf("insert settings: %w", err)
		}
	}

	return nil
}

func (s *ScoutStorage) UpdateProfileVersion(ctx context.Context, profileID int64, version int64, update models.VersionUpdate) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	defer func() {
		rollbackErr := tx.Rollback(ctx)

		if rollbackErr == nil {
			return
		}

		s.logger.Error().Err(rollbackErr).Msg("failed to rollback tx")
	}()

	isVersionInTestModeQuery := `
		SELECT test_mode
		FROM scout.profile_versions
		WHERE profile_id = $1 AND version = $2
		LIMIT 1
		FOR UPDATE
	`

	row := tx.QueryRow(ctx, isVersionInTestModeQuery, profileID, version)

	var isInTestMode bool

	if err := row.Scan(&isInTestMode); err != nil {
		return fmt.Errorf("scan: %w", err)
	}

	if !isInTestMode {
		return fmt.Errorf("version is not in test mode")
	}

	// (source) => (settings update, if nil delete else update)
	sourceSettingsUpdates := make(map[*string]*models.ProfileSettings)

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
				Where(sq.Eq{"profile_id": profileID}).
				Where(sq.Eq{"version": version}).
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

		// Inserting if not exists

		extractedPropertiesJSON, err := json.Marshal(settingsUpdate.ExtractedProperties)
		if err != nil {
			return fmt.Errorf("marshal extracted properties: %w", err)
		}

		insertSettingsSb := tools.Psq().
			Insert("scout.profile_settings").
			Columns("profile_id", "version", "source", "relevancy_filter", "extracted_properties").
			Values(profileID, version, source, settingsUpdate.RelevancyFilter, extractedPropertiesJSON).
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
			Where(sq.Eq{"profile_id": profileID}).
			Where(sq.Eq{"version": version}).
			Where(sq.Eq{"source": source}).
			Set("updated_at", sq.Expr("NOW()")).
			Set("relevancy_filter", settingsUpdate.RelevancyFilter).
			Set("extracted_properties", extractedPropertiesJSON)

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

func (s *ScoutStorage) CreateProfileVersion(ctx context.Context, profileID int64, version models.ProfileVersion) (id int64, err error) {
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

	maxVersion := int64(0)

	maxVersionQuery := `
		SELECT MAX(version) FROM scout.profile_versions WHERE profile_id = $1
	`

	row := tx.QueryRow(ctx, maxVersionQuery, profileID)
	if err := row.Scan(&maxVersion); err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return 0, fmt.Errorf("scan: %w", err)
		}
	}

	version.Version = maxVersion + 1

	if err := s.insertVersion(ctx, tx, profileID, version); err != nil {
		return 0, fmt.Errorf("insert version: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit tx: %w", err)
	}

	return version.Version, nil
}

func (s *ScoutStorage) DeployProfileVersion(ctx context.Context, profileID int64, version int64) error {
	deployProfileVersionQuery := `
		UPDATE scout.profile_versions
		SET test_mode = false, updated_at = NOW()
		WHERE profile_id = $1 AND version = $2
	`

	_, err := s.pool.Exec(ctx, deployProfileVersionQuery, profileID, version)
	if err != nil {
		return fmt.Errorf("deploy profile version: %w", err)
	}

	return nil
}

//nolint:gocognit,funlen // TODO: refactor
func (s *ScoutStorage) UpdateProfile(ctx context.Context, update models.ProfileUpdate) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	defer func() {
		rollbackErr := tx.Rollback(ctx)

		if rollbackErr == nil {
			return
		}

		s.logger.Error().Err(rollbackErr).Msg("failed to rollback tx")
	}()

	// Updating profile

	updateProfileSb := tools.Psq().
		Update("scout.profiles").
		Where(sq.Eq{"id": update.ProfileID}).
		Set("updated_at", sq.Expr("NOW()"))

	if update.Name != nil {
		updateProfileSb = updateProfileSb.Set("name", *update.Name)
	}

	updateProfileSQL, updateProfileArgs, err := updateProfileSb.ToSql()
	if err != nil {
		return fmt.Errorf("updateProfileSb to sql: %w", err)
	}

	_, err = tx.Exec(ctx, updateProfileSQL, updateProfileArgs...)
	if err != nil {
		return fmt.Errorf("update scout.profiles: %w", err)
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

	if query.Filter.ProfileIDs != nil {
		sb = sb.Where(sq.Eq{"d.profile_id": *query.Filter.ProfileIDs})
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
