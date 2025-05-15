package config

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Config holds application configuration
type SettingsConfig struct {
	Google struct {
		Model       string  `json:"model" yaml:"model"`
		Temperature float32 `json:"temperature" yaml:"temperature"`
	} `json:"google" yaml:"google"`

	TaskProcessor struct {
		BatchSize      int           `json:"batch_size" yaml:"batch_size"`
		Workers        int           `json:"workers" yaml:"workers"`
		Timeout        time.Duration `json:"timeout" yaml:"timeout"`
		ErrorTimeout   time.Duration `json:"error_timeout" yaml:"error_timeout"`
		NoTasksTimeout time.Duration `json:"no_tasks_timeout" yaml:"no_tasks_timeout"`
		Disabled       bool          `json:"disabled" yaml:"disabled"`
	} `json:"task_processor" yaml:"task_processor"`

	API struct {
		Port     int  `json:"port" yaml:"port"`
		Disabled bool `json:"disabled" yaml:"disabled"`
	} `json:"api" yaml:"api"`

	Reddit struct {
		Scraper struct {
			Timeout                  time.Duration `json:"timeout" yaml:"timeout"`
			ErrorTimeout             time.Duration `json:"error_timeout" yaml:"error_timeout"`
			TimeoutAfterFullScan     time.Duration `json:"timeout_after_full_scan" yaml:"timeout_after_full_scan"`
			AtLeastOneExhaustingScan bool          `json:"at_least_one_exhausting_scan" yaml:"at_least_one_exhausting_scan"`
			Disabled                 bool          `json:"disabled" yaml:"disabled"`
		} `json:"scraper" yaml:"scraper"`

		Enricher struct {
			BatchSize    int           `json:"batch_size" yaml:"batch_size"`
			MinPostAge   time.Duration `json:"min_post_age" yaml:"min_post_age"`
			Workers      int           `json:"workers" yaml:"workers"`
			Retries      int           `json:"retries" yaml:"retries"`
			Timeout      time.Duration `json:"timeout" yaml:"timeout"`
			ErrorTimeout time.Duration `json:"error_timeout" yaml:"error_timeout"`
			Disabled     bool          `json:"disabled" yaml:"disabled"`
		} `json:"enricher" yaml:"enricher"`

		Scheduler struct {
			BatchSize    int           `json:"batch_size" yaml:"batch_size"`
			MinScore     int           `json:"min_score" yaml:"min_score"`
			Timeout      time.Duration `json:"timeout" yaml:"timeout"`
			ErrorTimeout time.Duration `json:"error_timeout" yaml:"error_timeout"`
			Disabled     bool          `json:"disabled" yaml:"disabled"`
		} `json:"scheduler" yaml:"scheduler"`
	} `json:"reddit" yaml:"reddit"`
}

func ParseSettingsConfig(path string) (SettingsConfig, error) {
	var cfg SettingsConfig

	content, err := os.ReadFile(path)
	if err != nil {
		return SettingsConfig{}, fmt.Errorf("read file: %w", err)
	}

	switch {
	case strings.HasSuffix(path, ".json"):
		if err := json.Unmarshal(content, &cfg); err != nil {
			return SettingsConfig{}, fmt.Errorf("unmarshal json: %w", err)
		}
	case strings.HasSuffix(path, ".yaml"), strings.HasSuffix(path, ".yml"):
		if err := yaml.Unmarshal(content, &cfg); err != nil {
			return SettingsConfig{}, fmt.Errorf("unmarshal yaml: %w", err)
		}
	default:
		return SettingsConfig{}, fmt.Errorf("unsupported file extension: %s", path)
	}

	return cfg, nil
}
