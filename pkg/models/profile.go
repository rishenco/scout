package models

import (
	"time"

	"github.com/rishenco/scout/pkg/nullable"
)

type Profile struct {
	ID              int64                      `json:"id"`
	Name            string                     `json:"name"`
	Active          bool                       `json:"active"`
	DefaultSettings *ProfileSettings           `json:"default_settings"`
	SourcesSettings map[string]ProfileSettings `json:"sources_settings"`
	CreatedAt       time.Time                  `json:"created_at"`
	UpdatedAt       time.Time                  `json:"updated_at"`
}

type ProfileSettings struct {
	ProfileID           int64             `json:"profile_id"`
	RelevancyFilter     string            `json:"relevancy_filter"`
	ExtractedProperties map[string]string `json:"extracted_properties"`
	CreatedAt           time.Time         `json:"created_at"`
	UpdatedAt           time.Time         `json:"updated_at"`
}

type ProfileUpdate struct {
	ProfileID int64
	Name      *string
	Active    *bool
	// If the value is not set, it will be ignored
	//
	// If the value is set, null means that default settings must be deleted
	DefaultSettings nullable.Nullable[ProfileSettingsUpdate]
	SourcesSettings map[string]*ProfileSettingsUpdate
}

type ProfileSettingsUpdate struct {
	RelevancyFilter     *string
	ExtractedProperties *map[string]string
}
