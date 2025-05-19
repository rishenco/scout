package models

import "time"

type AnalysisTask struct {
	// ID is task id
	//
	// Example: 123
	ID int64 `json:"id"`
	// SourceID is source post ID
	//
	// Example: reddit post id
	SourceID string `json:"source_id"`
	// ProfileID is an identifier of a Scout's profile
	ProfileID int64 `json:"profile_id"`
	// Source is a source of post
	//
	// Example: reddit
	Source string `json:"source"`
	// ShouldSave is a flag that indicates if the results of analysis should be saved
	ShouldSave bool `json:"should_save"`
	// CreatedAt is a timestamp of task creation
	CreatedAt time.Time `json:"created_at"`
}
