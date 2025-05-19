package reddit

import (
	"time"

	"github.com/samber/lo"
	"github.com/vartanbeno/go-reddit/v2/reddit"

	"github.com/rishenco/scout/internal/sources"
)

type RawPostAndComments struct {
	Data   []byte `json:"data"`
	PostID string `json:"post_id"`
}

type SubredditSettings struct {
	Profiles  []int64 `json:"profiles"`
	Subreddit string  `json:"subreddit"`
}

// All models below are almost exact copies of the original models from the reddit library.
// We need them to avoid troubles with the json marshalling/unmarshalling.

type PostAndComments struct {
	Post     Post      `json:"post"`
	Comments []Comment `json:"comments"`
	// More     *reddit.More    `json:"-"`
}

func (p PostAndComments) ID() string {
	return p.Post.ID
}

func (p PostAndComments) Source() string {
	return sources.RedditSource
}

type Post struct {
	ID      string     `json:"id,omitempty"`
	FullID  string     `json:"name,omitempty"`
	Created *time.Time `json:"created_utc,omitempty"`
	Edited  *time.Time `json:"edited,omitempty"`

	Permalink string `json:"permalink,omitempty"`
	URL       string `json:"url,omitempty"`

	Title string `json:"title,omitempty"`
	Body  string `json:"selftext,omitempty"`

	// Indicates if you've upvoted/downvoted (true/false).
	// If neither, it will be nil.
	Likes *bool `json:"likes"`

	Score            int     `json:"score"`
	UpvoteRatio      float32 `json:"upvote_ratio"`
	NumberOfComments int     `json:"num_comments"`

	SubredditName         string `json:"subreddit,omitempty"`
	SubredditNamePrefixed string `json:"subreddit_name_prefixed,omitempty"`
	SubredditID           string `json:"subreddit_id,omitempty"`
	SubredditSubscribers  int    `json:"subreddit_subscribers"`

	Author   string `json:"author,omitempty"`
	AuthorID string `json:"author_fullname,omitempty"`

	Spoiler    bool `json:"spoiler"`
	Locked     bool `json:"locked"`
	NSFW       bool `json:"over_18"`
	IsSelfPost bool `json:"is_self"`
	Saved      bool `json:"saved"`
	Stickied   bool `json:"stickied"`
}

type Comment struct {
	ID      string     `json:"id,omitempty"`
	FullID  string     `json:"name,omitempty"`
	Created *time.Time `json:"created_utc,omitempty"`
	Edited  *time.Time `json:"edited,omitempty"`

	ParentID  string `json:"parent_id,omitempty"`
	Permalink string `json:"permalink,omitempty"`

	Body            string `json:"body,omitempty"`
	Author          string `json:"author,omitempty"`
	AuthorID        string `json:"author_fullname,omitempty"`
	AuthorFlairText string `json:"author_flair_text,omitempty"`
	AuthorFlairID   string `json:"author_flair_template_id,omitempty"`

	SubredditName         string `json:"subreddit,omitempty"`
	SubredditNamePrefixed string `json:"subreddit_name_prefixed,omitempty"`
	SubredditID           string `json:"subreddit_id,omitempty"`

	// Indicates if you've upvote/downvoted (true/false).
	// If neither, it will be nil.
	Likes *bool `json:"likes"`

	Score            int `json:"score"`
	Controversiality int `json:"controversiality"`

	PostID string `json:"link_id,omitempty"`
	// This doesn't appear consistently.
	PostTitle string `json:"link_title,omitempty"`
	// This doesn't appear consistently.
	PostPermalink string `json:"link_permalink,omitempty"`
	// This doesn't appear consistently.
	PostAuthor string `json:"link_author,omitempty"`
	// This doesn't appear consistently.
	PostNumComments *int `json:"num_comments,omitempty"`

	IsSubmitter bool `json:"is_submitter"`
	ScoreHidden bool `json:"score_hidden"`
	Saved       bool `json:"saved"`
	Stickied    bool `json:"stickied"`
	Locked      bool `json:"locked"`
	CanGild     bool `json:"can_gild"`
	NSFW        bool `json:"over_18"`

	Replies Replies `json:"replies"`
}

type Replies struct {
	Comments []Comment `json:"comments,omitempty"`
	// More
}

func PostAndCommentsFromLib(post *reddit.PostAndComments) PostAndComments {
	return PostAndComments{
		Post: PostFromLib(post.Post),
		Comments: lo.Map(post.Comments, func(comment *reddit.Comment, _ int) Comment {
			return CommentFromLib(comment)
		}),
	}
}

func PostFromLib(post *reddit.Post) Post {
	rp := Post{
		ID:     post.ID,
		FullID: post.FullID,
		// Created:               &post.Created.Time,
		// Edited:                &post.Edited.Time,
		Permalink:             post.Permalink,
		URL:                   post.URL,
		Title:                 post.Title,
		Body:                  post.Body,
		Likes:                 post.Likes,
		Score:                 post.Score,
		UpvoteRatio:           post.UpvoteRatio,
		NumberOfComments:      post.NumberOfComments,
		SubredditName:         post.SubredditName,
		SubredditNamePrefixed: post.SubredditNamePrefixed,
		SubredditID:           post.SubredditID,
		SubredditSubscribers:  post.SubredditSubscribers,
		Author:                post.Author,
		AuthorID:              post.AuthorID,
		Spoiler:               post.Spoiler,
		Locked:                post.Locked,
		NSFW:                  post.NSFW,
		IsSelfPost:            post.IsSelfPost,
		Saved:                 post.Saved,
		Stickied:              post.Stickied,
	}

	if post.Created != nil {
		rp.Created = &post.Created.Time
	}

	if post.Edited != nil {
		rp.Edited = &post.Edited.Time
	}

	return rp
}

func CommentFromLib(comment *reddit.Comment) Comment {
	rc := Comment{
		ID:     comment.ID,
		FullID: comment.FullID,
		// Created:               &comment.Created.Time,
		// Edited:                &comment.Edited.Time,
		ParentID:              comment.ParentID,
		Permalink:             comment.Permalink,
		Body:                  comment.Body,
		Author:                comment.Author,
		AuthorID:              comment.AuthorID,
		AuthorFlairText:       comment.AuthorFlairText,
		AuthorFlairID:         comment.AuthorFlairID,
		SubredditName:         comment.SubredditName,
		SubredditNamePrefixed: comment.SubredditNamePrefixed,
		SubredditID:           comment.SubredditID,
		Likes:                 comment.Likes,
		Score:                 comment.Score,
		Controversiality:      comment.Controversiality,
		PostID:                comment.PostID,
		PostTitle:             comment.PostTitle,
		PostPermalink:         comment.PostPermalink,
		PostAuthor:            comment.PostAuthor,
		PostNumComments:       comment.PostNumComments,
		IsSubmitter:           comment.IsSubmitter,
		ScoreHidden:           comment.ScoreHidden,
		Saved:                 comment.Saved,
		Stickied:              comment.Stickied,
		Locked:                comment.Locked,
		CanGild:               comment.CanGild,
		NSFW:                  comment.NSFW,
		Replies:               RepliesFromLib(comment.Replies),
	}

	if comment.Created != nil {
		rc.Created = &comment.Created.Time
	}

	if comment.Edited != nil {
		rc.Edited = &comment.Edited.Time
	}

	return rc
}

func RepliesFromLib(replies reddit.Replies) Replies {
	rr := Replies{
		Comments: lo.Map(replies.Comments, func(comment *reddit.Comment, _ int) Comment {
			return CommentFromLib(comment)
		}),
	}

	return rr
}
