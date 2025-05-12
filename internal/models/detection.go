package models

type Detection struct {
	IsRelevant bool              `json:"is_relevant"`
	Properties map[string]string `json:"properties"`
}

type DetectionRecord struct {
	Source     string            `json:"source"`
	PostID     string            `json:"post_id"`
	ProfileID  int               `json:"profile_id"`
	IsRelevant bool              `json:"is_relevant"`
	Properties map[string]string `json:"properties"`
}
