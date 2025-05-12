package pg

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rishenco/scout/internal/models"
	"github.com/rs/zerolog"
)

// ScoutStorage represents the PostgreSQL storage for Scout
type ScoutStorage struct {
	pool *pgxpool.Pool

	logger zerolog.Logger
}

// NewScoutStorage creates a new ScoutStorage
func NewScoutStorage(pool *pgxpool.Pool, logger zerolog.Logger) *ScoutStorage {
	return &ScoutStorage{
		pool:   pool,
		logger: logger,
	}
}

func (s *ScoutStorage) GetAnalysisTasksForProcessing(ctx context.Context, batchSize int) ([]*models.AnalysisTask, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, document_id, profiles
		FROM scout.analysis_tasks
		WHERE status = 'pending'
		ORDER BY created_at ASC
		LIMIT $1
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query analysis tasks: %w", err)
	}
	defer rows.Close()

}

// AddDocuments adds documents to the database
func (s *ScoutStorage) AddDocuments(ctx context.Context, documents []*models.DocumentInput) ([]*models.DocumentOutput, error) {
	outputs := make([]*models.DocumentOutput, 0, len(documents))

	// Begin transaction
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Prepare statement
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO scout.documents (source, source_id, data, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (source, source_id) DO UPDATE
		SET data = $3, updated_at = $5
		RETURNING id
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	// Insert documents
	now := time.Now()
	for _, doc := range documents {
		var id int
		err = stmt.QueryRowContext(ctx, doc.Source, doc.SourceID, doc.Data, now, now).Scan(&id)
		if err != nil {
			return nil, fmt.Errorf("failed to insert document: %w", err)
		}

		outputs = append(outputs, &models.DocumentOutput{
			Source:     doc.Source,
			SourceID:   doc.SourceID,
			DocumentID: id,
		})
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return outputs, nil
}

// GetDocument gets a document by ID
func (s *ScoutStorage) GetDocument(ctx context.Context, id int) (*models.Document, error) {
	var doc models.Document
	var data []byte
	var createdAt, updatedAt time.Time

	err := s.db.QueryRowContext(ctx, `
		SELECT id, source, source_id, data, created_at, updated_at
		FROM scout.documents
		WHERE id = $1
	`, id).Scan(&doc.ID, &doc.Source, &doc.SourceID, &data, &createdAt, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("document not found: %d", id)
		}
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	doc.Data = data
	doc.CreatedAt = createdAt
	doc.UpdatedAt = updatedAt

	return &doc, nil
}

// GetProfileSettings gets profile settings for a source and profile
func (s *ScoutStorage) GetProfileSettings(ctx context.Context, source, profile string) (*models.SourceProfileSettings, error) {
	var settings models.SourceProfileSettings
	var extractedPropertiesJSON []byte
	var createdAt, updatedAt time.Time

	err := s.db.QueryRowContext(ctx, `
		SELECT source, profile, relevancy_filter, extracted_properties, created_at, updated_at
		FROM scout.source_profile_settings
		WHERE source = $1 AND profile = $2
	`, source, profile).Scan(&settings.Source, &settings.Profile, &settings.RelevancyFilter, &extractedPropertiesJSON, &createdAt, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("profile settings not found: %s/%s", source, profile)
		}
		return nil, fmt.Errorf("failed to get profile settings: %w", err)
	}

	// Parse extracted properties
	var extractedProperties map[string]string
	if err := json.Unmarshal(extractedPropertiesJSON, &extractedProperties); err != nil {
		return nil, fmt.Errorf("failed to parse extracted properties: %w", err)
	}
	settings.ExtractedProperties = extractedProperties
	settings.CreatedAt = createdAt
	settings.UpdatedAt = updatedAt

	return &settings, nil
}

// SaveReport saves a report to the database
func (s *ScoutStorage) SaveReport(ctx context.Context, report *models.Report) error {
	// Marshal detections to JSON
	detectionsJSON, err := report.MarshalDetections()
	if err != nil {
		return fmt.Errorf("failed to marshal detections: %w", err)
	}

	// Insert report
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO scout.reports (document_id, detections, created_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`, report.DocumentID, detectionsJSON, report.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert report: %w", err)
	}

	return nil
}
