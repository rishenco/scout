package models

import (
	"time"

	"github.com/rishenco/scout/pkg/nullable"
)

type Profile struct {
	ID              int64            `json:"id"`
	Name            string           `json:"name"`
	SelectedVersion int64            `json:"selected_version"`
	Versions        []ProfileVersion `json:"versions"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

type ProfileCreateInput struct {
	Name    string
	Version ProfileVersion
}

type ProfileVersion struct {
	Version         int64                      `json:"version"`
	TestMode        bool                       `json:"test_mode"`
	DefaultSettings *ProfileSettings           `json:"default_settings"`
	SourcesSettings map[string]ProfileSettings `json:"sources_settings"`
	CreatedAt       time.Time                  `json:"created_at"`
	UpdatedAt       time.Time                  `json:"updated_at"`
}

type ProfileSettings struct {
	ProfileID           int64             `json:"profile_id"`
	Version             int64             `json:"version"`
	RelevancyFilter     string            `json:"relevancy_filter"`
	ExtractedProperties map[string]string `json:"extracted_properties"`
}

type ProfileUpdate struct {
	ProfileID int64
	Name      *string
}

type VersionUpdate struct {
	Version         int64
	DefaultSettings nullable.Nullable[ProfileSettings]
	SourcesSettings map[string]*ProfileSettings
}
