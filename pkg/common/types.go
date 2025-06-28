package common

import (
	"math"

	"k8s.io/apimachinery/pkg/runtime"
)

type SearchResult struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Namespace    string `json:"namespace,omitempty"`
	ResourceType string `json:"resourceType"`
	CreatedAt    string `json:"createdAt"`
}

// PaginationInfo contains pagination metadata
type PaginationInfo struct {
	TotalCount  int  `json:"totalCount"`
	TotalPages  int  `json:"totalPages"`
	CurrentPage int  `json:"currentPage"`
	PageSize    int  `json:"pageSize"`
	HasNextPage bool `json:"hasNextPage"`
	HasPrevPage bool `json:"hasPrevPage"`
}

// PaginatedResponse wraps any data with pagination information
type PaginatedResponse struct {
	Items      runtime.Object `json:"items"`
	Pagination PaginationInfo `json:"pagination"`
}

// NewPaginatedResponse creates a new paginated response with calculated pagination info
func NewPaginatedResponse(items runtime.Object, totalCount, currentPage, pageSize int) PaginatedResponse {
	totalPages := int(math.Ceil(float64(totalCount) / float64(pageSize)))
	if totalPages == 0 {
		totalPages = 1
	}

	return PaginatedResponse{
		Items: items,
		Pagination: PaginationInfo{
			TotalCount:  totalCount,
			TotalPages:  totalPages,
			CurrentPage: currentPage,
			PageSize:    pageSize,
			HasNextPage: currentPage < totalPages,
			HasPrevPage: currentPage > 1,
		},
	}
}

type Action string

const (
	ActionRestart     Action = "restart"
	ActionUpdateImage Action = "updateImage"
)

type WebhookRequest struct {
	Action    Action `json:"action" binding:"required,oneof=restart updateImage"`
	Resource  string `json:"resource" binding:"required,oneof=deployments statefulsets daemonsets"`
	Name      string `json:"name" binding:"required"` // Name of the resource to act upon
	Namespace string `json:"namespace"`

	// Optional data for the action
	// ActionUpdateImage => containerName:ImageName
	Data string `json:"data,omitempty" binding:"required_if=Action updateImage"` // Must be printable ASCII characters
}

type Resource struct {
	Allocatable int64 `json:"allocatable"`
	Requested   int64 `json:"requested"`
	Limited     int64 `json:"limited"`
}

type ResourceMetric struct {
	CPU Resource `json:"cpu,omitempty"`
	Mem Resource `json:"memory,omitempty"`
}

type PasswordLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}
