package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/kube"
	"golang.org/x/net/websocket"
	"k8s.io/klog/v2"
)

type TerminalHandler struct {
}

func NewTerminalHandler() *TerminalHandler {
	return &TerminalHandler{}
}

// HandleTerminalWebSocket handles WebSocket connections for terminal sessions
func (h *TerminalHandler) HandleTerminalWebSocket(c *gin.Context) {
	// Get cluster info from context
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	// Get path parameters
	namespace := c.Param("namespace")
	podName := c.Param("podName")
	container := c.Query("container")

	if namespace == "" || podName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "namespace and podName are required"})
		return
	}

	websocket.Handler(func(ws *websocket.Conn) {
		ctx, cancel := context.WithCancel(c.Request.Context())
		defer cancel()
		session := kube.NewTerminalSession(cs.K8sClient, ws, namespace, podName, container)
		defer session.Close()

		if err := session.Start(ctx, "exec"); err != nil {
			klog.Errorf("Terminal session error: %v", err)
		}
	}).ServeHTTP(c.Writer, c.Request)
}
