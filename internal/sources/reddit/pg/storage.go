package pg

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rishenco/scout/internal/sources/reddit"
	"github.com/rs/zerolog"
)

type Storage struct {
	pool   *pgxpool.Pool
	logger zerolog.Logger
}

func NewStorage(pool *pgxpool.Pool, logger zerolog.Logger) *Storage {
	return &Storage{
		pool:   pool,
		logger: logger,
	}
}

func (s *Storage) InsertPosts(ctx context.Context, posts []reddit.Post) error {
	columns := []string{
		"post_id",
		"post_json",
		"enriched_post_json",
		"post_created_at",
		"enriched_at",
		"scheduled_at",
		"is_enriched",
		"is_scheduled",
	}

	rows := make([][]interface{}, 0, len(posts))

	for _, post := range posts {
		marshalledPost, err := json.Marshal(post)
		if err != nil {
			return fmt.Errorf("marshal post: %w", err)
		}

		rows = append(rows, []interface{}{
			post.ID,        // post_id
			marshalledPost, // post_json
			nil,            // enriched_post_json
			post.Created,   // post_created_at
			nil,            // enriched_at
			nil,            // scheduled_at
			false,          // is_enriched
			false,          // is_scheduled
		})
	}

	_, err := s.pool.CopyFrom(
		ctx,
		pgx.Identifier{"reddit", "posts"},
		columns,
		pgx.CopyFromRows(rows),
	)

	if err != nil {
		return fmt.Errorf("copy from: %w", err)
	}

	return nil
}

func (s *Storage) EnrichPosts(ctx context.Context, posts []reddit.PostAndComments) error {
	updateQuery := `
		UPDATE reddit.posts 
		SET enriched_post_json = $1,
			is_enriched = true,
			enriched_at = now()
		WHERE post_id = $2
	`

	batch := new(pgx.Batch)

	for _, post := range posts {
		marshalledPost, err := json.Marshal(post)
		if err != nil {
			return fmt.Errorf("marshal post: %w", err)
		}

		batch.Queue(updateQuery, marshalledPost, post.Post.ID)
	}

	if err := s.pool.SendBatch(ctx, batch).Close(); err != nil {
		return fmt.Errorf("send batch: %w", err)
	}

	return nil
}

func (s *Storage) MarkPostsAsScheduled(ctx context.Context, postIDs []string) error {
	updateQuery := `
		UPDATE reddit.posts
		SET is_scheduled = true,
			scheduled_at = now()
		WHERE post_id = ANY($1)
	`

	if _, err := s.pool.Exec(ctx, updateQuery, postIDs); err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *Storage) CheckPresence(ctx context.Context, postIDs []string) (map[string]struct{}, error) {
	query := `
		SELECT post_id
		FROM reddit.posts
		WHERE post_id = ANY($1)
	`

	rows, err := s.pool.Query(ctx, query, postIDs)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	presence := make(map[string]struct{})

	for rows.Next() {
		var postID string

		if err := rows.Scan(&postID); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		presence[postID] = struct{}{}
	}

	return presence, nil
}

func (s *Storage) GetPostsForEnrichment(ctx context.Context, postCreatedBefore time.Time, limit int) (postIDs []string, err error) {
	query := `
		SELECT post_id
		FROM reddit.posts
		WHERE NOT is_enriched AND post_created_at < $1
		ORDER BY post_created_at
		LIMIT $2
	`

	rows, err := s.pool.Query(ctx, query, postCreatedBefore, limit)
	if err != nil {
		return nil, fmt.Errorf("select: %w", err)
	}

	defer rows.Close()

	postIDs = make([]string, 0)

	for rows.Next() {
		var postID string

		if err := rows.Scan(&postID); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		postIDs = append(postIDs, postID)
	}

	return postIDs, nil
}

func (s *Storage) GetPostsForScheduling(ctx context.Context, minScore int, limit int) (posts []reddit.PostAndComments, err error) {
	query := `
		SELECT enriched_post_json
		FROM reddit.posts
		WHERE NOT is_scheduled AND is_enriched AND (enriched_post_json->'post'->>'score')::integer >= $1
		ORDER BY post_created_at
		LIMIT $2
	`

	rows, err := s.pool.Query(ctx, query, minScore, limit)
	if err != nil {
		return nil, fmt.Errorf("select: %w", err)
	}

	defer rows.Close()

	posts = make([]reddit.PostAndComments, 0)

	for rows.Next() {
		var enrichedPostJSON []byte

		if err := rows.Scan(&enrichedPostJSON); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		var post reddit.PostAndComments
		if err := json.Unmarshal(enrichedPostJSON, &post); err != nil {
			return nil, fmt.Errorf("unmarshal: %w", err)
		}

		posts = append(posts, post)
	}

	return posts, nil
}

func (s *Storage) GetPostByID(ctx context.Context, postID string) (post reddit.PostAndComments, err error) {
	query := `
		SELECT enriched_post_json
		FROM reddit.posts
		WHERE post_id = $1
	`

	var enrichedPostJSON []byte

	if err := s.pool.QueryRow(ctx, query, postID).Scan(&enrichedPostJSON); err != nil {
		return reddit.PostAndComments{}, fmt.Errorf("scan: %w", err)
	}

	if err := json.Unmarshal(enrichedPostJSON, &post); err != nil {
		return reddit.PostAndComments{}, fmt.Errorf("unmarshal: %w", err)
	}

	return post, nil
}

func (s *Storage) GetSubredditsSettings(ctx context.Context, subreddits []string) (subredditsSettings []reddit.SubredditSettings, err error) {
	query := `
		SELECT subreddit, profiles
		FROM reddit.subreddit_settings
		WHERE subreddit = ANY($1)
	`

	rows, err := s.pool.Query(ctx, query, subreddits)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	for rows.Next() {
		var subreddit string
		var profiles []int64

		if err := rows.Scan(&subreddit, &profiles); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		settings := reddit.SubredditSettings{
			Subreddit: subreddit,
			Profiles:  profiles,
		}

		subredditsSettings = append(subredditsSettings, settings)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return subredditsSettings, nil
}

func (s *Storage) GetSubredditsForScraping(ctx context.Context) (subreddits []string, err error) {
	query := `
		SELECT DISTINCT subreddit
		FROM reddit.subreddit_settings
	`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	for rows.Next() {
		var subreddit string

		if err := rows.Scan(&subreddit); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		subreddits = append(subreddits, subreddit)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return subreddits, nil
}
