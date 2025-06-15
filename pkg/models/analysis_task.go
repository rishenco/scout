package models

import "time"

const (
	ScheduledTaskType = "scheduled"
	ManualTaskType    = "manual"
)

type AnalysisTask struct {
	// ID is task id
	//
	// Example: 123
	ID int64 `json:"id"`

	// Type is a type of the task
	//
	// Examples: scheduled, manual
	Type string `json:"type"`

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
	// Source is a source of post
	//
	// Example: reddit
	Source string `json:"source"`
	// ShouldSave is a flag that indicates if the results of analysis should be saved
	ShouldSave bool `json:"should_save"`
}
