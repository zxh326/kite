package model

type ResourceTemplate struct {
	Model
	Name        string `json:"name" gorm:"uniqueIndex"`
	Description string `json:"description"`
	YAML        string `json:"yaml"`
}
