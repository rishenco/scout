package models

import "time"

type PostInterface interface {
	ID() string
	Source() string
}

type Post struct {
	ID        int64     `json:"id"`
	Data      []byte    `json:"data"`
	Source    string    `json:"source"`
	SourceID  string    `json:"source_id"`
	CreatedAt time.Time `json:"created_at"`
}
