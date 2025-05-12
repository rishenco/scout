package models

import "time"

type AnalysisTask struct {
	ID         int64     `json:"id"`
	PostID     int64     `json:"post_id"`
	ProfileID  int64     `json:"profile_id"`
	Source     string    `json:"source"`
	ShouldSave bool      `json:"should_save"`
	CreatedAt  time.Time `json:"created_at"`
}
