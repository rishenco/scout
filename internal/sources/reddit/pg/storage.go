package pg

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"

	"github.com/rishenco/scout/internal/sources/reddit"
	"github.com/rishenco/scout/internal/tools"
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

func (s *Storage) GetPostsForEnrichment(
	ctx context.Context,
	postCreatedBefore time.Time,
	limit int,
) (postIDs []string, err error) {
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

func (s *Storage) GetPostsForScheduling(
	ctx context.Context,
	batchSize int,
	minScore int,
) (posts []reddit.PostAndComments, err error) {
	query := `
		SELECT enriched_post_json
		FROM reddit.posts
		WHERE NOT is_scheduled AND is_enriched AND (enriched_post_json->'post'->>'score')::integer >= $1
		ORDER BY post_created_at
		LIMIT $2
	`

	rows, err := s.pool.Query(ctx, query, minScore, batchSize)
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

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return posts, nil
}

func (s *Storage) GetRawPosts(ctx context.Context, postIDs []string) (posts []reddit.RawPostAndComments, err error) {
	query := `
		SELECT post_id, enriched_post_json
		FROM reddit.posts
		WHERE post_id = ANY($1)
	`

	rows, err := s.pool.Query(ctx, query, postIDs)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	posts = make([]reddit.RawPostAndComments, 0)

	for rows.Next() {
		var rawPost reddit.RawPostAndComments

		if err := rows.Scan(&rawPost.PostID, &rawPost.Data); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		posts = append(posts, rawPost)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return posts, nil
}

func (s *Storage) GetPosts(ctx context.Context, postIDs []string) (posts []reddit.PostAndComments, err error) {
	rawPosts, err := s.GetRawPosts(ctx, postIDs)
	if err != nil {
		return nil, fmt.Errorf("get raw posts: %w", err)
	}

	posts = make([]reddit.PostAndComments, 0, len(rawPosts))

	for _, rawPost := range rawPosts {
		if len(rawPost.Data) == 0 {
			continue
		}

		var post reddit.PostAndComments
		if err := json.Unmarshal(rawPost.Data, &post); err != nil {
			return nil, fmt.Errorf("unmarshal: %w", err)
		}

		posts = append(posts, post)
	}

	return posts, nil
}

func (s *Storage) GetSubredditsSettings(
	ctx context.Context,
	subreddits []string,
) (subredditsSettings []reddit.SubredditSettings, err error) {
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

func (s *Storage) GetAllSubredditSettings(ctx context.Context) ([]reddit.SubredditSettings, error) {
	query := `
		SELECT subreddit, profiles
		FROM reddit.subreddit_settings
		ORDER BY subreddit
	`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var settings []reddit.SubredditSettings

	for rows.Next() {
		var setting reddit.SubredditSettings

		if err := rows.Scan(&setting.Subreddit, &setting.Profiles); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		settings = append(settings, setting)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return settings, nil
}

func (s *Storage) GetAllSubredditSettingsWithProfileID(
	ctx context.Context,
	profileID int64,
) ([]reddit.SubredditSettings, error) {
	query := `
		SELECT subreddit, profiles
		FROM reddit.subreddit_settings
		WHERE $1 = ANY(profiles)
		ORDER BY subreddit
	`

	rows, err := s.pool.Query(ctx, query, profileID)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	var settings []reddit.SubredditSettings

	for rows.Next() {
		var setting reddit.SubredditSettings

		if err := rows.Scan(&setting.Subreddit, &setting.Profiles); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		settings = append(settings, setting)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return settings, nil
}

func (s *Storage) AddProfilesToSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error {
	query := `
		INSERT INTO reddit.subreddit_settings (subreddit, profiles)
		VALUES ($1, $2)
		ON CONFLICT (subreddit)
		DO UPDATE SET profiles = (
			SELECT ARRAY(
				SELECT DISTINCT unnest(reddit.subreddit_settings.profiles || EXCLUDED.profiles)
			)
		)
	`

	if _, err := s.pool.Exec(ctx, query, subreddit, profileIDs); err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *Storage) RemoveProfilesFromSubreddit(ctx context.Context, subreddit string, profileIDs []int64) error {
	query := `
		UPDATE reddit.subreddit_settings
		SET profiles = COALESCE((
			SELECT array_agg(p)
			FROM unnest(profiles) AS p
			WHERE p != ALL($2)
		), '{}')
		WHERE subreddit = $1
	`

	_, err := s.pool.Exec(ctx, query, subreddit, profileIDs)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *Storage) RemoveProfileFromAllSubredditSettings(ctx context.Context, profileID int64) error {
	query := `
		UPDATE reddit.subreddit_settings
		SET profiles = COALESCE((
			SELECT array_agg(p)
			FROM unnest(profiles) AS p
			WHERE p != $1
		), '{}')
	`

	_, err := s.pool.Exec(ctx, query, profileID)
	if err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

func (s *Storage) GetScheduledPostIDsFromSubreddits(
	ctx context.Context,
	subreddits []string,
	days *int,
	limit *int,
) ([]string, error) {
	psq := tools.Psq().
		Select("post_id").
		From("reddit.posts").
		Where(sq.Eq{"lower((post_json->>'subreddit')::text)": subreddits}).
		OrderBy("post_created_at")

	if days != nil {
		cutoffDate := time.Now().AddDate(0, 0, -*days)

		psq = psq.Where(sq.Gt{"post_created_at": cutoffDate})
	}

	if limit != nil {
		limitValue := *limit
		limitValue = max(0, limitValue)

		//nolint:gosec // limit value can't overflow uint64
		psq = psq.Limit(uint64(limitValue))
	}

	query, args, err := psq.ToSql()
	if err != nil {
		return nil, fmt.Errorf("to sql: %w", err)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}

	defer rows.Close()

	postIDs := make([]string, 0)

	for rows.Next() {
		var postID string

		if err := rows.Scan(&postID); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}

		postIDs = append(postIDs, postID)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return postIDs, nil
}
