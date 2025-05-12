package client

import (
	"context"
	"fmt"

	"github.com/rishenco/scout/internal/sources/reddit"
	"github.com/rs/zerolog"
	"github.com/samber/lo"
	redditlib "github.com/vartanbeno/go-reddit/v2/reddit"
)

type requestsLog interface {
	Save(ctx context.Context, requestType string, request any, response any) error
}

const (
	defaultLimit = 100 // Default limit for Reddit API requests
)

// Client handles interactions with the Reddit API
type Client struct {
	client      *redditlib.Client
	requestsLog requestsLog

	logger zerolog.Logger
}

type RedditAuth struct {
	ClientID     string
	ClientSecret string
	Username     string
	Password     string
	UserAgent    string
}

func New(auth RedditAuth, requestsLog requestsLog, logger zerolog.Logger) (*Client, error) {
	credentials := redditlib.Credentials{
		ID:       auth.ClientID,
		Secret:   auth.ClientSecret,
		Username: auth.Username,
		Password: auth.Password,
	}

	_ = credentials

	client, err := redditlib.NewClient(credentials, redditlib.WithUserAgent(auth.UserAgent))
	if err != nil {
		return nil, fmt.Errorf("create reddit client: %w", err)
	}

	return &Client{
		client:      client,
		requestsLog: requestsLog,
		logger:      logger,
	}, nil
}

func (c *Client) GetPosts(ctx context.Context, subreddit string, after string, limit int) (posts []reddit.Post, nextAfter string, err error) {
	c.logger.Debug().
		Str("subreddit", subreddit).
		Str("after", after).
		Msg("retrieving posts")

	limit = min(limit, defaultLimit)

	// Define the listing options
	opts := &redditlib.ListOptions{
		Limit: limit,
		After: after,
	}

	// Get posts from the subreddit
	posts_, resp, err := c.client.Subreddit.NewPosts(ctx, subreddit, opts)
	if err != nil {
		return nil, "", fmt.Errorf("get new posts: %w", err)
	}

	c.logger.Info().
		Str("subreddit", subreddit).
		Int("posts_count", len(posts_)).
		Msg("retrieved posts")

	posts = lo.Map(posts_, func(post *redditlib.Post, _ int) reddit.Post {
		return reddit.PostFromLib(post)
	})

	err = c.requestsLog.Save(
		ctx,
		"get_posts",
		map[string]any{
			"subreddit": subreddit,
			"after":     after,
			"limit":     limit,
		},
		posts,
	)
	if err != nil {
		c.logger.Error().Err(err).Msg("failed to save request log")
	}

	return posts, resp.After, nil
}

func (c *Client) GetPost(ctx context.Context, id string) (post reddit.PostAndComments, err error) {
	post_, _, err := c.client.Post.Get(ctx, id)
	if err != nil {
		return reddit.PostAndComments{}, fmt.Errorf("get post: %w", err)
	}

	err = c.requestsLog.Save(
		ctx,
		"get_post",
		map[string]any{
			"post_id": id,
		},
		post_,
	)
	if err != nil {
		c.logger.Error().Err(err).Msg("failed to save request log")
	}

	return reddit.PostAndCommentsFromLib(post_), nil
}
