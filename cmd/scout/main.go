package main

import (
	"context"
	"flag"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"golang.org/x/sync/errgroup"

	"github.com/rishenco/scout/internal/codec"
	"github.com/rishenco/scout/internal/config"
	"github.com/rishenco/scout/internal/models"
	"github.com/rishenco/scout/internal/pg"
	"github.com/rishenco/scout/internal/scout"
	"github.com/rishenco/scout/internal/sources/reddit"
	redditanalyzer "github.com/rishenco/scout/internal/sources/reddit/analyzer"
	redditclient "github.com/rishenco/scout/internal/sources/reddit/client"
	redditpg "github.com/rishenco/scout/internal/sources/reddit/pg"
	"github.com/rishenco/scout/internal/tools"
)

var (
	settingsConfigPath = flag.String("settings", "settings.yaml", "path to settings config")
)

func main() {
	flag.Parse()

	// Setup context with cancellation
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	// Parse config
	credentialsConfig, err := config.ParseCredentialsConfig()
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to parse config")
	}

	settingsConfig, err := config.ParseSettingsConfig(*settingsConfigPath)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to parse settings config")
	}

	// Connect to Postgres
	postgresPool, err := pgxpool.New(ctx, credentialsConfig.PostgresConnString)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer postgresPool.Close()

	scoutStorage := pg.NewScoutStorage(postgresPool, componentLogger(logger, "scout_storage"))
	taskStorage := pg.NewTaskStorage(postgresPool, componentLogger(logger, "task_storage"))
	requestsStorage := pg.NewRequestsStorage(postgresPool, componentLogger(logger, "requests_storage"))
	redditStorage := redditpg.NewStorage(postgresPool, componentLogger(logger, "reddit_storage"))

	redditAnalyzer, err := redditanalyzer.NewGeminiAnalyzer(
		credentialsConfig.GeminiAPIKey,
		redditanalyzer.GeminiSettings{
			Model:       settingsConfig.Google.Model,
			Temperature: settingsConfig.Google.Temperature,
		},
		tools.WrapRequestsStorage(requestsStorage, "reddit_gemini_analyzer"),
		componentLogger(logger, "reddit_gemini_analyzer"),
	)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to create gemini reddit analyzer")
	}

	redditScout := scout.New(
		redditAnalyzer,
		scoutStorage,
		taskStorage,
		codec.JSONCodec[reddit.PostAndComments]{},
		models.RedditSource,
		componentLogger(logger, "reddit_scout"),
	)

	redditClient, err := redditclient.New(
		redditclient.RedditAuth{
			ClientID:     credentialsConfig.RedditClientID,
			ClientSecret: credentialsConfig.RedditClientSecret,
			Username:     credentialsConfig.RedditUsername,
			Password:     credentialsConfig.RedditPassword,
			UserAgent:    credentialsConfig.RedditUserAgent,
		},
		tools.WrapRequestsStorage(requestsStorage, "reddit_client"),
		componentLogger(logger, "reddit_client"),
	)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to create reddit client")
	}

	redditScraper := reddit.NewScraper(
		redditClient,
		redditStorage,
		settingsConfig.Reddit.Scraper.Timeout,
		settingsConfig.Reddit.Scraper.ErrorTimeout,
		settingsConfig.Reddit.Scraper.TimeoutAfterFullScan,
		settingsConfig.Reddit.Scraper.AtLeastOneExhaustingScan,
		componentLogger(logger, "reddit_scraper"),
	)

	redditEnricher := reddit.NewEnricher(
		redditClient,
		redditStorage,
		settingsConfig.Reddit.Enricher.BatchSize,
		settingsConfig.Reddit.Enricher.MinPostAge,
		settingsConfig.Reddit.Enricher.Timeout,
		settingsConfig.Reddit.Enricher.ErrorTimeout,
		settingsConfig.Reddit.Enricher.Retries,
		settingsConfig.Reddit.Enricher.Workers,
		componentLogger(logger, "reddit_enricher"),
	)

	redditScheduler := reddit.NewScheduler(
		redditStorage,
		redditScout,
		settingsConfig.Reddit.Scheduler.BatchSize,
		settingsConfig.Reddit.Scheduler.MinScore,
		settingsConfig.Reddit.Scheduler.Timeout,
		settingsConfig.Reddit.Scheduler.ErrorTimeout,
		componentLogger(logger, "reddit_scheduler"),
	)

	redditTaskProcessor := scout.NewTaskProcessor[reddit.PostAndComments](
		taskStorage,
		redditScout,
		models.RedditSource,
		settingsConfig.Reddit.TaskProcessor.BatchSize,
		settingsConfig.Reddit.TaskProcessor.Timeout,
		settingsConfig.Reddit.TaskProcessor.ErrorTimeout,
		settingsConfig.Reddit.TaskProcessor.NoTasksTimeout,
		settingsConfig.Reddit.TaskProcessor.Workers,
		componentLogger(logger, "reddit_task_processor"),
	)

	// Run services using errgroup
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		pg.UnclaimTasks(
			ctx,
			taskStorage,
			time.Minute,
			time.Minute,
			componentLogger(logger, "tasks_unclaimer"),
		)

		return nil
	})

	if !settingsConfig.Reddit.Scraper.Disabled {
		g.Go(func() error {
			return redditScraper.Start(ctx)
		})
	}

	if !settingsConfig.Reddit.Enricher.Disabled {
		g.Go(func() error {
			return redditEnricher.Start(ctx)
		})
	}

	if !settingsConfig.Reddit.Scheduler.Disabled {
		g.Go(func() error {
			return redditScheduler.Start(ctx)
		})
	}

	if !settingsConfig.Reddit.TaskProcessor.Disabled {
		g.Go(func() error {
			redditTaskProcessor.Start(ctx)

			return nil
		})
	}

	// Wait for all services to complete
	if err := g.Wait(); err != nil {
		logger.Error().Err(err).Msg("service error")
	}

	logger.Info().Msg("gracefully shut down")
}

func componentLogger(logger zerolog.Logger, component string) zerolog.Logger {
	return logger.With().Str("component", component).Logger()
}
