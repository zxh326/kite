package model

import (
	"github.com/zxh326/kite/pkg/common"
	"gorm.io/gorm"
)

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

	OperatorID uint  `json:"operatorId" gorm:"not null;index"`
	Operator   *User `json:"operator" gorm:"foreignKey:OperatorID;constraint:OnDelete:CASCADE"`
}

func (ResourceHistory) TableName() string {
	return "resource_histories"
}

func (ResourceHistory) AfterMigrate(tx *gorm.DB) error {
	indexName := "idx_resource_histories_lookup_with_time"
	tableName := "resource_histories"

	// Check database type and use appropriate syntax
	if common.DBType == "mysql" {
		// For MySQL, check if index exists first
		var count int64
		tx.Raw(`
			SELECT COUNT(1) 
			FROM information_schema.statistics 
			WHERE table_schema = DATABASE() 
			AND table_name = ? 
			AND index_name = ?
		`, tableName, indexName).Scan(&count)

		if count == 0 {
			return tx.Exec(`
				CREATE INDEX ` + indexName + ` 
				ON ` + tableName + ` (cluster_name, resource_type, resource_name, namespace, created_at DESC)
			`).Error
		}
		return nil
	}

	// For SQLite and PostgreSQL, use IF NOT EXISTS
	return tx.Exec(`
		CREATE INDEX IF NOT EXISTS ` + indexName + ` 
		ON ` + tableName + ` (cluster_name, resource_type, resource_name, namespace, created_at DESC)
	`).Error
}
