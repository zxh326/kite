package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/portforward"
)

type PortForwardHandler struct{}

func NewPortForwardHandler() *PortForwardHandler {
	return &PortForwardHandler{}
}

func (h *PortForwardHandler) RegisterRoutes(group *gin.RouterGroup) {
	group.GET("", h.List)
	group.DELETE("/:id", h.Delete)
}

func (h *PortForwardHandler) List(c *gin.Context) {
	sessions := portforward.GlobalManager.List()
	c.JSON(http.StatusOK, sessions)
}

func (h *PortForwardHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	portforward.GlobalManager.Stop(id)
	c.JSON(http.StatusOK, gin.H{"message": "Port forwarding session stopped"})
}
