package reddit

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

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

// NewScraper creates a new Scraper instance
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

// Start begins periodically reading posts from all subreddits
func (s *Scraper) Start(ctx context.Context) error {
	s.logger.Info().
		Dur("timeout", s.timeout).
		Dur("error_timeout", s.errorTimeout).
		Dur("timeout_after_full_scan", s.timeoutAfterFullScan).
		Msg("starting Reddit reader")

	paginator_ := newPaginator()

	for {
		if ctx.Err() != nil {
			return fmt.Errorf("context error: %w", ctx.Err())
		}

		timeout := s.timeout

		if err := s.poll(ctx, paginator_); err != nil {
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

func (s *Scraper) poll(ctx context.Context, paginator_ *paginator) error {
	if err := s.syncSubreddits(ctx, paginator_); err != nil {
		return fmt.Errorf("sync subreddits: %w", err)
	}

	// select subreddit
	var subreddit string

	for subredditCandidate, pagination := range paginator_.subreddits {
		if time.Now().Before(pagination.availableAt) {
			continue
		}

		subreddit = subredditCandidate

		break
	}

	if subreddit == "" {
		return fmt.Errorf("no subreddit to poll")
	}

	s.logger.Info().
		Str("subreddit", subreddit).
		Str("next_page", paginator_.subreddits[subreddit].next).
		Msg("polling subreddit")

	redditPosts, nextPage, err := s.reddit.GetPosts(ctx, subreddit, paginator_.subreddits[subreddit].next, 100)
	if err != nil {
		return fmt.Errorf("get posts: %w", err)
	}

	if len(redditPosts) == 0 {
		// no posts, meaning we've reached the end of the subreddit
		s.logger.Info().
			Str("subreddit", subreddit).
			Msg("no posts, meaning we've exhausted the subreddit")

		paginator_.subreddits[subreddit] = subredditPagination{
			next:        "",
			availableAt: time.Now().Add(s.timeoutAfterFullScan),
		}

		paginator_.alreadyFullyScanned[subreddit] = struct{}{}

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
		// we've reached the page we've processed

		_, fullyScanned := paginator_.alreadyFullyScanned[subreddit]

		if fullyScanned || !s.forceAtLeastOneExhaustingScan {
			s.logger.Info().
				Str("subreddit", subreddit).
				Msg("we've reached the page without new posts - cooldown and scanning from the beginning")

			paginator_.subreddits[subreddit] = subredditPagination{
				next:        "",
				availableAt: time.Now().Add(s.timeoutAfterFullScan),
			}

			return nil
		}
	}

	if err := s.storage.InsertPosts(ctx, notPresentPosts); err != nil {
		return fmt.Errorf("insert: %w", err)
	}

	paginator_.subreddits[subreddit] = subredditPagination{
		next:        nextPage,
		availableAt: time.Now(),
	}

	if len(notPresentPosts) > 0 {
		s.logger.Info().
			Str("subreddit", subreddit).
			Str("next_page", nextPage).
			Int("new_posts", len(notPresentPosts)).
			Msg("added new posts")
	} else {
		s.logger.Info().
			Str("subreddit", subreddit).
			Str("next_page", nextPage).
			Msg("no new posts")
	}

	return nil
}

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
	subreddits          map[string]subredditPagination
	alreadyFullyScanned map[string]struct{}
}

type subredditPagination struct {
	next string
	// for cooldown
	availableAt time.Time
}
