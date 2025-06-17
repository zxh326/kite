package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/prometheus"
)

type ResourceRequest struct {
	CPU    *ResourceMetric `json:"cpu"`
	Memory *ResourceMetric `json:"memory"`
}

type ResourceMetric struct {
	Request float64 `json:"request"`
	Total   float64 `json:"total"`
	Unit    string  `json:"unit"`
}

type PromHandler struct {
	prometheusClient *prometheus.Client
}

func NewPromHandler(prometheusClient *prometheus.Client) *PromHandler {
	return &PromHandler{
		prometheusClient: prometheusClient,
	}
}

func (h *PromHandler) GetResourceUsageHistory(c *gin.Context) {
	ctx := c.Request.Context()

	// Get query parameter for time range
	duration := c.DefaultQuery("duration", "1h")

	// Validate duration parameter
	validDurations := map[string]bool{
		"30m": true,
		"1h":  true,
		"24h": true,
	}

	if !validDurations[duration] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid duration. Must be one of: 30m, 1h, 24h"})
		return
	}

	// Get resource usage history if Prometheus is available
	if h.prometheusClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Prometheus client not available"})
		return
	}

	instance := c.Query("instance")
	resourceUsageHistory, err := h.prometheusClient.GetResourceUsageHistory(ctx, instance, duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get resource usage history: %v", err)})
		return
	}

	c.JSON(http.StatusOK, resourceUsageHistory)
}

// GetPodMetrics handles pod-specific metrics requests
func (h *PromHandler) GetPodMetrics(c *gin.Context) {
	ctx := c.Request.Context()

	// Get path parameters
	namespace := c.Param("namespace")
	podName := c.Param("podName")
	if namespace == "" || podName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "namespace and podName are required"})
		return
	}

	// Get query parameters
	duration := c.DefaultQuery("duration", "1h")
	container := c.Query("container") // Optional container name

	// Validate duration parameter
	validDurations := map[string]bool{
		"30m": true,
		"1h":  true,
		"24h": true,
	}

	if !validDurations[duration] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid duration. Must be one of: 30m, 1h, 24h"})
		return
	}

	// Check if Prometheus is available
	if h.prometheusClient == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Prometheus client not available"})
		return
	}

	podMetrics, err := h.prometheusClient.GetPodMetrics(ctx, namespace, podName, container, duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get pod metrics: %v", err)})
		return
	}
	c.JSON(http.StatusOK, podMetrics)
}
