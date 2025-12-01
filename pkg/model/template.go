package model

import "gorm.io/gorm"

type ResourceTemplate struct {
	gorm.Model
	Name        string `json:"name" gorm:"uniqueIndex"`
	Description string `json:"description"`
	YAML        string `json:"yaml"`
}
