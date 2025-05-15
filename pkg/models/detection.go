package models

import (
	"time"

	"github.com/rishenco/scout/pkg/nullable"
)

type DetectionOrder string

const (
	DetectionOrderAsc  DetectionOrder = "detection_order_asc"
	DetectionOrderDesc DetectionOrder = "detection_order_desc"
)

type Detection struct {
	IsRelevant bool              `json:"is_relevant"`
	Properties map[string]string `json:"properties"`
}

type DetectionRecord struct {
	ID         int64             `json:"id"`
	Source     string            `json:"source"`
	SourceID   string            `json:"source_id"`
	ProfileID  int64             `json:"profile_id"`
	IsRelevant bool              `json:"is_relevant"`
	Properties map[string]string `json:"properties"`
	CreatedAt  time.Time         `json:"created_at"`
}

type DetectionTags struct {
	DetectionID                int64
	RelevancyDetectedCorrectly *bool
}

type DetectionQuery struct {
	LastSeenID *int64
	Limit      int64
	Order      DetectionOrder
	Filter     *DetectionFilter
}

type DetectionFilter struct {
	ProfileIDs *[]int64
	Sources    *[]string
	IsRelevant *bool
	Tags       DetectionTagsFilter
}

type DetectionTagsFilter struct {
	RelevancyDetectedCorrectly *[]*bool
}

type DetectionTagsUpdate struct {
	DetectionID                int64
	RelevancyDetectedCorrectly nullable.Nullable[bool]
}
