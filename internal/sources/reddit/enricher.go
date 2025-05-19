package reddit

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

type enricherStorage interface {
	GetPostsForEnrichment(ctx context.Context, postCreatedBefore time.Time, limit int) (postIDs []string, err error)
	EnrichPosts(ctx context.Context, posts []PostAndComments) error
}

type enricherReddit interface {
	GetPost(ctx context.Context, id string) (post PostAndComments, err error)
}

type Enricher struct {
	reddit        enricherReddit
	storage       enricherStorage
	minPostAge    time.Duration
	batchSize     int
	timeout       time.Duration
	errorTimeout  time.Duration
	retries       int
	workersAmount int
	logger        zerolog.Logger
}

func NewEnricher(
	reddit enricherReddit,
	storage enricherStorage,
	batchSize int,
	minPostAge time.Duration,
	timeout time.Duration,
	errorTimeout time.Duration,
	retries int,
	workersAmount int,
	logger zerolog.Logger,
) *Enricher {
	return &Enricher{
		reddit:        reddit,
		storage:       storage,
		minPostAge:    minPostAge,
		batchSize:     batchSize,
		timeout:       timeout,
		errorTimeout:  errorTimeout,
		retries:       retries,
		workersAmount: workersAmount,
		logger:        logger,
	}
}

func (e *Enricher) Start(ctx context.Context) error {
	for {
		if ctx.Err() != nil {
			return fmt.Errorf("context error: %w", ctx.Err())
		}

		timeout := e.timeout

		if err := e.enrichPosts(ctx); err != nil {
			e.logger.Error().Err(err).Msg("error enriching posts")

			timeout = e.errorTimeout
		}

		select {
		case <-time.After(timeout):
			continue
		case <-ctx.Done():
			return fmt.Errorf("context error: %w", ctx.Err())
		}
	}
}

func (e *Enricher) enrichPosts(ctx context.Context) error {
	postsCutoffTime := time.Now().Add(-e.minPostAge)

	postIDs, err := e.storage.GetPostsForEnrichment(ctx, postsCutoffTime, e.batchSize)
	if err != nil {
		return fmt.Errorf("get posts for enrichment: %w", err)
	}

	if len(postIDs) == 0 {
		return nil
	}

	postIDsChan := lo.SliceToChannel(len(postIDs), postIDs)
	postsChan := make(chan PostAndComments, len(postIDs))
	wg := new(sync.WaitGroup)

	for range max(1, e.workersAmount) {
		wg.Add(1)

		go func() {
			defer wg.Done()

			e.postLoaderWorker(ctx, postIDsChan, postsChan)
		}()
	}

	go func() {
		wg.Wait()

		close(postsChan)
	}()

	posts := lo.ChannelToSlice(postsChan)

	if err := e.savePosts(ctx, posts); err != nil {
		return fmt.Errorf("save posts: %w", err)
	}

	for _, post := range posts {
		e.logger.Info().Str("post_id", post.ID()).Msg("enriched post")
	}

	return nil
}

func (e *Enricher) postLoaderWorker(ctx context.Context, postIDsChan <-chan string, postsChan chan<- PostAndComments) {
	for {
		select {
		case postID, ok := <-postIDsChan:
			if !ok {
				return
			}

			post, err := e.loadPost(ctx, postID)
			if err != nil {
				e.logger.Error().Err(err).Msg("error loading post")

				continue
			}

			postsChan <- post
		case <-ctx.Done():
			return
		}
	}
}

func (e *Enricher) loadPost(ctx context.Context, postID string) (PostAndComments, error) {
	var result PostAndComments

	err := e.retry(
		ctx,
		func() error {
			post, err := e.reddit.GetPost(ctx, postID)
			if err != nil {
				return fmt.Errorf("get post: %w", err)
			}

			result = post

			return nil
		},
		e.retries,
		e.errorTimeout,
	)

	if err != nil {
		return PostAndComments{}, fmt.Errorf("load post: %w", err)
	}

	return result, nil
}

func (e *Enricher) savePosts(ctx context.Context, posts []PostAndComments) error {
	return e.retry(
		ctx,
		func() error {
			if err := e.storage.EnrichPosts(ctx, posts); err != nil {
				return fmt.Errorf("enrich posts: %w", err)
			}

			return nil
		},
		e.retries,
		e.errorTimeout,
	)
}

func (e *Enricher) retry(ctx context.Context, fn func() error, retries int, errorTimeout time.Duration) error {
	var err error

	for range retries {
		if err = fn(); err != nil {
			e.logger.Error().Err(err).Msg("attempt failed")

			select {
			case <-ctx.Done():
				return fmt.Errorf("context error: %w", ctx.Err())
			case <-time.After(errorTimeout):
				continue
			}
		}

		return nil
	}

	return fmt.Errorf("all retries failed: %w", err)
}
