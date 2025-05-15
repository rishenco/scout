package models

type SourcePost struct {
	SourceID string                 `json:"source_id"`
	Post     map[string]interface{} `json:"post"`
}
