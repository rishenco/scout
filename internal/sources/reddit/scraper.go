package reddit

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

const maxPostsPerRequest = 100

type scraperStorage interface {
	InsertPosts(ctx context.Context, posts []Post) error
	CheckPresence(ctx context.Context, postIDs []string) (presentPosts map[string]struct{}, err error)
	GetSubredditsForScraping(ctx context.Context) (subreddits []string, err error)
}

type scraperReddit interface {
	GetPosts(ctx context.Context, subreddit string, after string, limit int) (posts []Post, nextPage string, err error)
}

type Scraper struct {
	reddit                        scraperReddit
	storage                       scraperStorage
	timeout                       time.Duration
	errorTimeout                  time.Duration
	timeoutAfterFullScan          time.Duration
	forceAtLeastOneExhaustingScan bool
	logger                        zerolog.Logger
}

// NewScraper creates a new Scraper instance.
func NewScraper(
	reddit scraperReddit,
	storage scraperStorage,
	timeout time.Duration,
	errorTimeout time.Duration,
	timeoutAfterFullScan time.Duration,
	forceAtLeastOneExhaustingScan bool,
	logger zerolog.Logger,
) *Scraper {
	return &Scraper{
		reddit:                        reddit,
		storage:                       storage,
		timeout:                       timeout,
		errorTimeout:                  errorTimeout,
		timeoutAfterFullScan:          timeoutAfterFullScan,
		forceAtLeastOneExhaustingScan: forceAtLeastOneExhaustingScan,
		logger:                        logger,
	}
}

// Start begins periodically reading posts from all subreddits.
func (s *Scraper) Start(ctx context.Context) error {
	s.logger.Info().
		Dur("timeout", s.timeout).
		Dur("error_timeout", s.errorTimeout).
		Dur("timeout_after_full_scan", s.timeoutAfterFullScan).
		Msg("starting Reddit reader")

	paginator := newPaginator()

	for {
		if ctx.Err() != nil {
			return fmt.Errorf("context error: %w", ctx.Err())
		}

		timeout := s.timeout

		if err := s.scrape(ctx, paginator); err != nil {
			s.logger.Error().Err(err).Msg("error updating subreddits")

			timeout = s.errorTimeout
		}

		select {
		case <-ctx.Done():
			return fmt.Errorf("context error: %w", ctx.Err())
		case <-time.After(timeout):
			continue
		}
	}
}

func (s *Scraper) scrape(ctx context.Context, paginator *paginator) error {
	if err := s.syncSubreddits(ctx, paginator); err != nil {
		return fmt.Errorf("sync subreddits: %w", err)
	}

	// looking for the first subreddit that can be scraped
	var subreddit string

	for subredditCandidate, pagination := range paginator.subreddits {
		if time.Now().Before(pagination.availableAt) {
			continue
		}

		subreddit = subredditCandidate

		break
	}

	if subreddit == "" {
		return errors.New("no subreddit to scrape")
	}

	// loading the next page of the subreddit

	redditPosts, nextPage, err := s.reddit.GetPosts(
		ctx,
		subreddit,
		paginator.subreddits[subreddit].next,
		maxPostsPerRequest,
	)
	if err != nil {
		return fmt.Errorf("get posts: %w", err)
	}

	if len(redditPosts) == 0 {
		// no posts, meaning we've reached the end of the subreddit (at least the end of posts available from API)
		s.logger.Info().
			Str("subreddit", subreddit).
			Msg("no posts, meaning we've exhausted the subreddit")

		paginator.subreddits[subreddit] = subredditPagination{
			next:        "",
			availableAt: time.Now().Add(s.timeoutAfterFullScan),
		}

		paginator.alreadyFullyScanned[subreddit] = struct{}{}

		return nil
	}

	ids := lo.Map(redditPosts, func(post Post, _ int) string {
		return post.ID
	})

	presentPosts, err := s.storage.CheckPresence(ctx, ids)
	if err != nil {
		return fmt.Errorf("are processed: %w", err)
	}

	notPresentPosts := lo.Filter(redditPosts, func(post Post, _ int) bool {
		_, isPresent := presentPosts[post.ID]

		return !isPresent
	})

	if len(notPresentPosts) == 0 {
		// we've reached the page we've processed => we can stop

		_, fullyScanned := paginator.alreadyFullyScanned[subreddit]

		if fullyScanned || !s.forceAtLeastOneExhaustingScan {
			s.logger.Info().
				Str("subreddit", subreddit).
				Msg("we've reached the page without new posts - cooldown and scanning from the beginning")

			paginator.subreddits[subreddit] = subredditPagination{
				next:        "",
				availableAt: time.Now().Add(s.timeoutAfterFullScan),
			}

			return nil
		}

		// if at least one exhausting scan is required we have to continue scraping
	}

	if err := s.storage.InsertPosts(ctx, notPresentPosts); err != nil {
		return fmt.Errorf("insert: %w", err)
	}

	paginator.subreddits[subreddit] = subredditPagination{
		next:        nextPage,
		availableAt: time.Now(),
	}

	for _, post := range notPresentPosts {
		s.logger.Info().Str("post_id", post.ID).Msg("scraped post")
	}

	return nil
}

// syncSubreddits loads all required subreddits from the storage, adds present subreddits
// and removes not present subreddits.
func (s *Scraper) syncSubreddits(ctx context.Context, p *paginator) error {
	subreddits, err := s.storage.GetSubredditsForScraping(ctx)
	if err != nil {
		return fmt.Errorf("get subreddits: %w", err)
	}

	subredditsIndex := lo.SliceToMap(subreddits, func(subreddit string) (string, struct{}) {
		return subreddit, struct{}{}
	})

	for subreddit := range subredditsIndex {
		if _, ok := p.subreddits[subreddit]; ok {
			continue
		}

		p.subreddits[subreddit] = subredditPagination{
			next:        "",
			availableAt: time.Now(),
		}
	}

	for subreddit := range p.subreddits {
		if _, ok := subredditsIndex[subreddit]; ok {
			continue
		}

		delete(p.subreddits, subreddit)
	}

	return nil
}

func newPaginator() *paginator {
	return &paginator{
		subreddits:          make(map[string]subredditPagination),
		alreadyFullyScanned: make(map[string]struct{}),
	}
}

type paginator struct {
	subreddits map[string]subredditPagination
	// needed to ensure at least one exhausting scan
	alreadyFullyScanned map[string]struct{}
}

type subredditPagination struct {
	// reddit's pagination token
	next string
	// time when the next page can be scraped
	availableAt time.Time
}
