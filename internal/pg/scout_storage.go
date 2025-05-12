package pg

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rishenco/scout/internal/models"
	"github.com/rs/zerolog"
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
		INSERT INTO scout.detections (source, post_id, profile_id, is_relevant, properties)
		VALUES ($1, $2, $3, $4, $5)
	`

	_, err := s.pool.Exec(
		ctx,
		query,
		record.Source,
		record.PostID,
		record.ProfileID,
		record.IsRelevant,
		record.Properties,
	)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *ScoutStorage) SavePosts(ctx context.Context, posts []models.Post) (sourceIDToPostID map[string]int64, err error) {
	query := `
		INSERT INTO scout.posts (data, source, source_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (source, source_id)
		DO UPDATE SET
			data = excluded.data
		RETURNING id, source_id
	`

	batch := new(pgx.Batch)

	for _, post := range posts {
		batch.Queue(query, post.Data, post.Source, post.ID)
	}

	results := s.pool.SendBatch(ctx, batch)

	defer results.Close()

	sourceIDToPostID = make(map[string]int64)

	for range posts {
		var (
			postID   int64
			sourceID string
		)

		if err := results.QueryRow().Scan(&postID, &sourceID); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		sourceIDToPostID[sourceID] = postID
	}

	return sourceIDToPostID, nil
}

func (s *ScoutStorage) GetProfile(ctx context.Context, profileID int64) (models.Profile, error) {
	query := `
		SELECT id, name, relevancy_filter, extracted_properties
		FROM scout.profiles
		WHERE id = $1
	`

	var profile models.Profile
	var rawExtractedProperties []byte

	if err := s.pool.QueryRow(ctx, query, profileID).Scan(&profile.ID, &profile.Name, &profile.RelevancyFilter, &rawExtractedProperties); err != nil {
		return models.Profile{}, fmt.Errorf("scan: %w", err)
	}

	if err := json.Unmarshal(rawExtractedProperties, &profile.ExtractedProperties); err != nil {
		return models.Profile{}, fmt.Errorf("unmarshal raw extracted properties: %w", err)
	}

	return profile, nil
}

func (s *ScoutStorage) GetPost(ctx context.Context, postID int64) (models.Post, error) {
	query := `
		SELECT id, data, source, source_id, created_at
		FROM scout.posts
		WHERE id = $1
	`

	var post models.Post

	row := s.pool.QueryRow(ctx, query, postID)

	err := row.Scan(&post.ID, &post.Data, &post.Source, &post.ID, &post.CreatedAt)
	if err != nil {
		return models.Post{}, fmt.Errorf("scan: %w", err)
	}

	return post, nil
}
