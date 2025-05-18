package config

import (
	"fmt"

	"github.com/kelseyhightower/envconfig"
)

type CredentialsConfig struct {
	GeminiAPIKey string `envconfig:"GEMINI_API_KEY"`

	PostgresConnString string `envconfig:"POSTGRES_CONN_STRING" required:"true"`

	Reddit RedditCredentialsConfig `envconfig:"REDDIT_CREDENTIALS"`
}

type RedditCredentialsConfig struct {
	ClientID     string `envconfig:"REDDIT_CLIENT_ID"`
	ClientSecret string `envconfig:"REDDIT_CLIENT_SECRET"`
	Username     string `envconfig:"REDDIT_USERNAME"`
	Password     string `envconfig:"REDDIT_PASSWORD"`
	UserAgent    string `envconfig:"REDDIT_USER_AGENT"`
}

func ParseCredentialsConfig() (CredentialsConfig, error) {
	var cfg CredentialsConfig

	err := envconfig.Process("", &cfg)
	if err != nil {
		return CredentialsConfig{}, fmt.Errorf("process envs: %w", err)
	}

	return cfg, nil
}
