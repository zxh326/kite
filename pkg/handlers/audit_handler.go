package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/model"
)

type AuditHandler struct{}

func NewAuditHandler() *AuditHandler {
	return &AuditHandler{}
}

type AuditLogResponse struct {
	Data       []model.ResourceHistory `json:"data"`
	Pagination struct {
		Page       int   `json:"page"`
		PageSize   int   `json:"pageSize"`
		Total      int64 `json:"total"`
		TotalPages int   `json:"totalPages"`
	} `json:"pagination"`
}

// ListAuditLogs returns a centralized audit log of all resource operations
func (h *AuditHandler) ListAuditLogs(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	// Parse query parameters
	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if err != nil || pageSize < 1 {
		pageSize = 50
	}
	if pageSize > 200 {
		pageSize = 200 // Max page size
	}

	// Optional filters
	resourceType := c.Query("resourceType")
	namespace := c.Query("namespace")
	operationType := c.Query("operationType")
	username := c.Query("username")
	success := c.Query("success")

	// Date range filters
	startDate := c.Query("startDate")
	endDate := c.Query("endDate")

	// Build query
	query := model.DB.Preload("Operator").Where("cluster_name = ?", cs.Name)

	if resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}
	if namespace != "" && namespace != "_all" {
		query = query.Where("namespace = ?", namespace)
	}
	if operationType != "" {
		query = query.Where("operation_type = ?", operationType)
	}
	if success != "" {
		successBool := success == "true"
		query = query.Where("success = ?", successBool)
	}
	if username != "" {
		// Join with users table to filter by username
		query = query.Joins("JOIN users ON users.id = resource_histories.operator_id").
			Where("users.username = ?", username)
	}
	if startDate != "" {
		if t, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("resource_histories.created_at >= ?", t)
		}
	}
	if endDate != "" {
		if t, err := time.Parse("2006-01-02", endDate); err == nil {
			// Add 1 day to include the entire end date
			query = query.Where("resource_histories.created_at < ?", t.Add(24*time.Hour))
		}
	}

	// Get total count
	var total int64
	if err := query.Model(&model.ResourceHistory{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count audit logs: " + err.Error()})
		return
	}

	// Get paginated results
	history := []model.ResourceHistory{}
	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs: " + err.Error()})
		return
	}

	// Calculate total pages
	totalPages := int(total) / pageSize
	if int(total)%pageSize != 0 {
		totalPages++
	}

	response := AuditLogResponse{
		Data: history,
	}
	response.Pagination.Page = page
	response.Pagination.PageSize = pageSize
	response.Pagination.Total = total
	response.Pagination.TotalPages = totalPages

	c.JSON(http.StatusOK, response)
}

// GetAuditStats returns statistics about audit logs
func (h *AuditHandler) GetAuditStats(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	stats := make(map[string]interface{})

	// Total operations
	var total int64
	model.DB.Model(&model.ResourceHistory{}).Where("cluster_name = ?", cs.Name).Count(&total)
	stats["total"] = total

	// Operations by type
	var opTypes []struct {
		OperationType string `json:"operationType"`
		Count         int64  `json:"count"`
	}
	model.DB.Model(&model.ResourceHistory{}).
		Select("operation_type, count(*) as count").
		Where("cluster_name = ?", cs.Name).
		Group("operation_type").
		Scan(&opTypes)
	stats["byOperationType"] = opTypes

	// Operations by resource type
	var resourceTypes []struct {
		ResourceType string `json:"resourceType"`
		Count        int64  `json:"count"`
	}
	model.DB.Model(&model.ResourceHistory{}).
		Select("resource_type, count(*) as count").
		Where("cluster_name = ?", cs.Name).
		Group("resource_type").
		Order("count DESC").
		Limit(10).
		Scan(&resourceTypes)
	stats["byResourceType"] = resourceTypes

	// Success rate
	var successCount int64
	model.DB.Model(&model.ResourceHistory{}).
		Where("cluster_name = ? AND success = ?", cs.Name, true).
		Count(&successCount)
	if total > 0 {
		stats["successRate"] = float64(successCount) / float64(total) * 100
	} else {
		stats["successRate"] = 0
	}

	// Recent activity (last 24 hours)
	var recentCount int64
	yesterday := time.Now().Add(-24 * time.Hour)
	model.DB.Model(&model.ResourceHistory{}).
		Where("cluster_name = ? AND created_at >= ?", cs.Name, yesterday).
		Count(&recentCount)
	stats["last24Hours"] = recentCount

	c.JSON(http.StatusOK, stats)
}
