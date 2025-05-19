package models

type SourcePost struct {
	SourceID string `json:"source_id"`
	// Post is a JSON object representing a post from a source.
	Post map[string]interface{} `json:"post"`
}
