package models

type SourcePost struct {
	SourceID string `json:"source_id"`
	// JSON is a raw json of the post.
	JSON []byte `json:"json"`
}
