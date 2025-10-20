package model

import "gorm.io/gorm"

type ResourceHistory struct {
	Model
	ClusterName string `json:"clusterName" gorm:"type:varchar(100);not null;index"`

	ResourceType string `json:"resourceType" gorm:"type:varchar(50);not null;index"`
	ResourceName string `json:"resourceName" gorm:"type:varchar(255);not null;index"`
	Namespace    string `json:"namespace" gorm:"type:varchar(100);index"`

	OperationType string `json:"operationType" gorm:"type:varchar(50);not null;index"`

	ResourceYAML string `json:"resourceYaml" gorm:"type:text"`
	PreviousYAML string `json:"previousYaml" gorm:"type:text"`

	Success      bool   `json:"success" gorm:"type:boolean"`
	ErrorMessage string `json:"errorMessage" gorm:"type:text"`

	OperatorID uint `json:"operatorId" gorm:"not null;index"`
	Operator   User `json:"operator" gorm:"foreignKey:OperatorID"`
}

func (ResourceHistory) TableName() string {
	return "resource_histories"
}

func (ResourceHistory) AfterMigrate(tx *gorm.DB) error {
	return tx.Exec(`
		CREATE INDEX IF NOT EXISTS idx_resource_histories_lookup_with_time 
		ON resource_histories (cluster_name, resource_type, resource_name, namespace, created_at DESC)
	`).Error
}
