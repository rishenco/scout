package config

import (
	"fmt"

	"github.com/kelseyhightower/envconfig"
)

type CredentialsConfig struct {
	GeminiAPIKey string `envconfig:"GEMINI_API_KEY"`

	PostgresConnString string `envconfig:"POSTGRES_CONN_STRING" required:"true"`

	RedditClientID     string `envconfig:"REDDIT_CLIENT_ID" required:"true"`
	RedditClientSecret string `envconfig:"REDDIT_CLIENT_SECRET" required:"true"`
	RedditUsername     string `envconfig:"REDDIT_USERNAME" required:"true"`
	RedditPassword     string `envconfig:"REDDIT_PASSWORD" required:"true"`
	RedditUserAgent    string `envconfig:"REDDIT_USER_AGENT" default:"scout:v1.0"`

	APIAccounts map[string]string `envconfig:"API_ACCOUNTS" required:"true"`
}

func ParseCredentialsConfig() (CredentialsConfig, error) {
	var cfg CredentialsConfig

	err := envconfig.Process("", &cfg)
	if err != nil {
		return CredentialsConfig{}, fmt.Errorf("process envs: %w", err)
	}

	return cfg, nil
}
