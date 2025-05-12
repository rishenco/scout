package models

type Profile struct {
	ID                  int               `json:"id"`
	Name                string            `json:"name"`
	RelevancyFilter     string            `json:"relevancy_filter"`
	ExtractedProperties map[string]string `json:"extracted_properties"`
}
