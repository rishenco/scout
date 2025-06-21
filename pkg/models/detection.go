package models

import (
	"time"

	"github.com/rishenco/scout/pkg/nullable"
)

// DetectionOrder is an order of detections in the result of querying a detection storage.
type DetectionOrder string

const (
	// DetectionOrderAsc sorts detections by their ids in ascending order.
	DetectionOrderAsc DetectionOrder = "detection_order_asc"
	// DetectionOrderDesc sorts detections by their ids in ascending order.
	DetectionOrderDesc DetectionOrder = "detection_order_desc"
)

type Detection struct {
	IsRelevant bool              `json:"is_relevant"`
	Properties map[string]string `json:"properties"`
}

type DetectionRecord struct {
	ID              int64             `json:"id"`
	Source          string            `json:"source"`
	SourceID        string            `json:"source_id"`
	ProfileID       int64             `json:"profile_id"`
	SettingsVersion int64             `json:"settings_version"`
	IsRelevant      bool              `json:"is_relevant"`
	Properties      map[string]string `json:"properties"`
	CreatedAt       time.Time         `json:"created_at"`
}

type DetectionTags struct {
	DetectionID                int64
	RelevancyDetectedCorrectly *bool
}

type DetectionQuery struct {
	// LastSeenID is the id of the last seen detection (for ascending order it is max seen id, for descending order it is min seen id).
	//
	// Example: 123
	LastSeenID *int64
	// Limit is the limit of detections to return.
	//
	// Example: 100
	Limit  int64
	Order  DetectionOrder
	Filter *DetectionFilter
}

type DetectionFilter struct {
	// Profiles is a list of profile ids to filter by.
	//
	// Example: [{profile_id: 123, source_versions: {reddit: 1}}]
	Profiles *[]ProfileFilter
	// Sources is a list of sources to filter by.
	//
	// Example: ["reddit", "linkedin"]
	Sources    *[]string
	IsRelevant *bool
	Tags       DetectionTagsFilter
}

type ProfileFilter struct {
	ProfileID              int64
	SourceSettingsVersions []SourceSettingsVersionsFilter
}

type SourceSettingsVersionsFilter struct {
	Source   *string
	Versions []int64
}

type DetectionTagsFilter struct {
	RelevancyDetectedCorrectly *[]*bool
}

type DetectionTagsUpdate struct {
	DetectionID                int64
	RelevancyDetectedCorrectly nullable.Nullable[bool]
}
