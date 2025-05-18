package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"

	"github.com/google/generative-ai-go/genai"
	"github.com/rs/zerolog"
	"google.golang.org/api/option"

	"github.com/rishenco/scout/internal/sources/reddit"
	"github.com/rishenco/scout/pkg/models"
)

type requestsLog interface {
	Save(ctx context.Context, requestType string, request any, response any) error
}

type GeminiSettings struct {
	Model       string
	Temperature float32
}

type Gemini struct {
	client             *genai.Client
	settings           GeminiSettings
	requestsLog        requestsLog
	maxCommentsPerPost int
	logger             zerolog.Logger
}

func NewGemini(
	ctx context.Context,
	apiKey string,
	settings GeminiSettings,
	requestsLog requestsLog,
	maxCommentsPerPost int,
	logger zerolog.Logger,
) (*Gemini, error) {
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("new client: %w", err)
	}

	return &Gemini{
		client:             client,
		settings:           settings,
		requestsLog:        requestsLog,
		maxCommentsPerPost: maxCommentsPerPost,
		logger:             logger,
	}, nil
}

func (a *Gemini) Analyze(
	ctx context.Context,
	post reddit.PostAndComments,
	profileSettings models.ProfileSettings,
) (detection models.Detection, err error) {
	logger := a.logger.With().Str("post_id", post.ID()).Str("source", post.Source()).Logger()

	postInputObject := a.prepareInputObject(profileSettings, post)

	postInputObjectJSON, err := json.Marshal(postInputObject)
	if err != nil {
		return models.Detection{}, fmt.Errorf("marshal input object to json: %w", err)
	}

	model := a.client.GenerativeModel(a.settings.Model)

	// Set model parameters
	model.SetTemperature(a.settings.Temperature)
	model.SetTopK(0)
	model.SetTopP(0.95)            //nolint:mnd // Currently hardcoded
	model.SetMaxOutputTokens(8192) //nolint:mnd // Currently hardcoded
	model.ResponseSchema = a.getResponseSchema(profileSettings.ExtractedProperties)
	model.ResponseMIMEType = "application/json"
	model.SystemInstruction = &genai.Content{
		Parts: []genai.Part{genai.Text(Prompt)},
	}

	// Generate content
	resp, err := model.GenerateContent(ctx, genai.Text(postInputObjectJSON))
	if err != nil {
		return models.Detection{}, fmt.Errorf("generate content: %w", err)
	}

	// Save request and response to log
	if a.requestsLog != nil {
		if err := a.requestsLog.Save(ctx, "analyze", postInputObjectJSON, resp); err != nil {
			logger.Error().Err(err).Msg("failed to save request/response to log")
			// Don't return here, continue processing
		}
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return models.Detection{}, errors.New("no content generated")
	}

	outputMessage, ok := resp.Candidates[0].Content.Parts[0].(genai.Text)
	if !ok {
		return models.Detection{}, errors.New("invalid response format")
	}

	// Parse response
	var output searchResult
	err = json.Unmarshal([]byte(outputMessage), &output)
	if err != nil {
		logger.Error().Str("output_message", string(outputMessage)).Err(err).Msg("failed to parse Google response")

		return models.Detection{}, fmt.Errorf("failed to parse Google response: %w", err)
	}

	detection = models.Detection{
		IsRelevant: output.IsRelevant,
		Properties: output.Properties,
	}

	return detection, nil
}

func (a *Gemini) getResponseSchema(extractedProperties map[string]string) *genai.Schema {
	// {
	// "is_relevant": true,
	// "properties": {
	// 	"idea_success": "high",
	// 	"is_ai_related": "false",
	// 	"project_url": "https://github.com/rasadov/EcommerceAPI",
	// 	"summary": "Introduction of an open-source e-commerce backend built in Go, using gRPC microservices, GraphQL, Kafka, and Docker, aimed at providing a scalable and modular solution for developers."
	// }
	// }

	extractedPropertiesSchema := make(map[string]*genai.Schema)
	for property, definition := range extractedProperties {
		extractedPropertiesSchema[property] = &genai.Schema{
			Type:        genai.TypeString,
			Nullable:    true,
			Description: definition,
		}
	}

	responseSchema := &genai.Schema{
		Type: genai.TypeObject,
		Properties: map[string]*genai.Schema{
			"is_relevant": {
				Type: genai.TypeBoolean,
			},
			"properties": {
				Type:       genai.TypeObject,
				Properties: extractedPropertiesSchema,
			},
		},
	}

	return responseSchema
}

func (a *Gemini) prepareInputObject(
	profileSettings models.ProfileSettings,
	post reddit.PostAndComments,
) redditInputObject {
	// Sort comments by score in descending order
	sort.Slice(post.Comments, func(i, j int) bool {
		return post.Comments[i].Score > post.Comments[j].Score
	})

	comments := make([]redditInputCommentObject, 0)

	commentsCount := min(len(post.Comments), a.maxCommentsPerPost)

	for _, comment := range post.Comments[:commentsCount] {
		comments = append(comments, redditInputCommentObject{
			Comment: comment.Body,
			Score:   comment.Score,
		})
	}

	inputObject := redditInputObject{
		Post: redditInputPostObject{
			Title: post.Post.Title,
			Body:  post.Post.Body,
			Score: post.Post.Score,
			Link:  post.Post.URL,
		},
		Comments:            comments,
		RelevancyFilter:     profileSettings.RelevancyFilter,
		ExtractedProperties: profileSettings.ExtractedProperties,
	}

	return inputObject
}
