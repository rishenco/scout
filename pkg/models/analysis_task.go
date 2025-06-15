package models

import "time"

type AnalysisTask struct {
	// ID is task id
	//
	// Example: 123
	ID int64 `json:"id"`

	// Parameters is a set of parameters for the task
	Parameters AnalysisParameters `json:"parameters"`

	// Previous processing errors
	Errors []string `json:"errors"`

	// CreatedAt is a timestamp of task creation
	CreatedAt time.Time `json:"created_at"`
}

type AnalysisParameters struct {
	// SourceID is source post ID
	//
	// Example: reddit post id
	SourceID string `json:"source_id"`
	// ProfileID is an identifier of a Scout's profile
	ProfileID int64 `json:"profile_id"`

	// TestMode is a flag that indicates if the task should be run in test mode
	TestMode bool `json:"test_mode"`

	// Version is a version of the profile to use
	Version int64 `json:"version"`

	// Source is a source of post
	//
	// Example: reddit
	Source string `json:"source"`
	// ShouldSave is a flag that indicates if the results of analysis should be saved
	ShouldSave bool `json:"should_save"`
}
