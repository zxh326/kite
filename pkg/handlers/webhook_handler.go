package handlers

import (
	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/handlers/resources"
	"k8s.io/klog/v2"
)

type WebhookHandler struct {
	cm *cluster.ClusterManager
}

func NewWebhookHandler(cm *cluster.ClusterManager) *WebhookHandler {
	return &WebhookHandler{
		cm: cm,
	}
}

func (h *WebhookHandler) HandleWebhook(c *gin.Context) {
	var body common.WebhookRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{
			"error": "Invalid request body " + err.Error(),
		})
		return
	}
	klog.V(2).Infof("Received webhook request: %+v", body)
	switch body.Action {
	case common.ActionRestart:
		handler, err := resources.GetHandler(body.Resource)
		if err != nil {
			c.JSON(400, gin.H{
				"error": "Invalid resource type",
			})
			return
		}
		if restartable, ok := handler.(resources.Restartable); ok {
			if err := restartable.Restart(c, body.Namespace, body.Name); err != nil {
				c.JSON(500, gin.H{
					"error": "Failed to restart resource: " + err.Error(),
				})
				return
			}
			c.JSON(200, gin.H{
				"message": "Resource restarted successfully",
			})
			return
		}
	case common.ActionUpdateImage:
	default:
		c.JSON(400, gin.H{
			"error": "Invalid action",
		})
	}
}
