package client

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"
	"github.com/samber/lo"
	redditlib "github.com/vartanbeno/go-reddit/v2/reddit"

	"github.com/rishenco/scout/internal/sources/reddit"
)

type requestsLog interface {
	Save(ctx context.Context, requestType string, request any, response any) error
}

const (
	maxLimit = 100 // Default limit for Reddit API requests
)

// Client handles interactions with the Reddit API.
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
	var client *redditlib.Client

	if auth.Username != "" && auth.Password != "" {
		authorizedClient, err := newAuthorizedRedditClient(auth)
		if err != nil {
			return nil, fmt.Errorf("create authorized reddit client: %w", err)
		}

		client = authorizedClient
	} else {
		readOnlyClient, err := newReadOnlyRedditClient(auth)
		if err != nil {
			return nil, fmt.Errorf("create read-only reddit client: %w", err)
		}

		client = readOnlyClient
	}

	return &Client{
		client:      client,
		requestsLog: requestsLog,
		logger:      logger,
	}, nil
}

func (c *Client) GetPosts(
	ctx context.Context,
	subreddit string,
	after string,
	limit int,
) (posts []reddit.Post, nextAfter string, err error) {
	limit = min(limit, maxLimit)

	// Define the listing options
	opts := &redditlib.ListOptions{
		Limit: limit,
		After: after,
	}

	// Get posts from the subreddit
	libPosts, resp, err := c.client.Subreddit.NewPosts(ctx, subreddit, opts)
	if err != nil {
		return nil, "", fmt.Errorf("get new posts: %w", err)
	}

	posts = lo.Map(libPosts, func(post *redditlib.Post, _ int) reddit.Post {
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
	libPost, _, err := c.client.Post.Get(ctx, id)
	if err != nil {
		return reddit.PostAndComments{}, fmt.Errorf("get post: %w", err)
	}

	err = c.requestsLog.Save(
		ctx,
		"get_post",
		map[string]any{
			"post_id": id,
		},
		libPost,
	)
	if err != nil {
		c.logger.Error().Err(err).Msg("failed to save request log")
	}

	return reddit.PostAndCommentsFromLib(libPost), nil
}

func newAuthorizedRedditClient(auth RedditAuth) (*redditlib.Client, error) {
	credentials := redditlib.Credentials{
		ID:       auth.ClientID,
		Secret:   auth.ClientSecret,
		Username: auth.Username,
		Password: auth.Password,
	}

	var options []redditlib.Opt

	if auth.UserAgent != "" {
		options = append(options, redditlib.WithUserAgent(auth.UserAgent))
	}

	authorizedClient, err := redditlib.NewClient(credentials, options...)
	if err != nil {
		return nil, fmt.Errorf("create authorized reddit client: %w", err)
	}

	return authorizedClient, nil
}

func newReadOnlyRedditClient(auth RedditAuth) (*redditlib.Client, error) {
	var options []redditlib.Opt

	if auth.UserAgent != "" {
		options = append(options, redditlib.WithUserAgent(auth.UserAgent))
	}

	readOnlyClient, err := redditlib.NewReadonlyClient(options...)
	if err != nil {
		return nil, fmt.Errorf("create read-only reddit client: %w", err)
	}

	return readOnlyClient, nil
}
