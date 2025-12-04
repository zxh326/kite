package model

type ResourceTemplate struct {
	Model
	Name        string `json:"name" gorm:"type:varchar(255);uniqueIndex;not null"`
	Description string `json:"description"`
	YAML        string `json:"yaml" gorm:"type:text"`
}
