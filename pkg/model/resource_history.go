package model

import "gorm.io/gorm"

type ResourceHistory struct {
	Model
	SequenceID  uint   `json:"sequenceId" gorm:"not null;index:idx_cluster_sequence,unique"` // ID per cluster
	ClusterName string `json:"clusterName" gorm:"type:varchar(100);not null;index;index:idx_cluster_sequence,unique"`

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

// BeforeCreate hook to auto-generate SequenceID per cluster
func (rh *ResourceHistory) BeforeCreate(tx *gorm.DB) error {
	// Get max sequence_id for this cluster
	var maxSeq uint
	err := tx.Model(&ResourceHistory{}).
		Where("cluster_name = ?", rh.ClusterName).
		Select("COALESCE(MAX(sequence_id), 0)").
		Scan(&maxSeq).Error
	
	if err != nil {
		return err
	}
	
	// Set next sequence ID
	rh.SequenceID = maxSeq + 1
	return nil
}

func (ResourceHistory) AfterMigrate(tx *gorm.DB) error {
	return tx.Exec(`
		CREATE INDEX IF NOT EXISTS idx_resource_histories_lookup_with_time 
		ON resource_histories (cluster_name, resource_type, resource_name, namespace, created_at DESC)
	`).Error
}
