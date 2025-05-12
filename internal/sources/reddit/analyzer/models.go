package analyzer

import "github.com/rishenco/scout/internal/sources/reddit"

type searchResult struct {
	IsRelevant bool              `json:"is_relevant"`
	Properties map[string]string `json:"properties"`
}

type redditInputPostObject struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Score int    `json:"score"`
	Link  string `json:"link"`
}

type redditInputCommentObject struct {
	Comment string `json:"comment"`
	Score   int    `json:"score"`
}

type redditInputObject struct {
	Post                redditInputPostObject      `json:"post"`
	Comments            []redditInputCommentObject `json:"comments"`
	RelevancyFilter     string                     `json:"relevancy_filter"`
	ExtractedProperties map[string]string          `json:"extracted_props"`
}

type redditPostPropsSchema struct {
	Post     reddit.Post      `mapstructure:"post"`
	Comments []reddit.Comment `mapstructure:"comments"`
}
