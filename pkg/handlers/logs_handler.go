package handlers

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	corev1 "k8s.io/api/core/v1"
)

type LogsHandler struct {
}

func NewLogsHandler() *LogsHandler {
	return &LogsHandler{}
}

// GetPodLogs handles fetching logs for a specific pod/container
func (h *LogsHandler) GetPodLogs(c *gin.Context) {
	ctx := c.Request.Context()

	// Get cluster info from context
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	// Get path parameters
	namespace := c.Param("namespace")
	podName := c.Param("podName")
	if namespace == "" || podName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "namespace and podName are required"})
		return
	}

	// Get query parameters
	container := c.Query("container")
	tailLines := c.DefaultQuery("tailLines", "100")
	follow := c.DefaultQuery("follow", "false")
	timestamps := c.DefaultQuery("timestamps", "true")
	previous := c.DefaultQuery("previous", "false")
	sinceSeconds := c.Query("sinceSeconds")

	// Parse parameters
	tail, err := strconv.ParseInt(tailLines, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tailLines parameter"})
		return
	}

	followBool := follow == "true"
	timestampsBool := timestamps == "true"
	previousBool := previous == "true"

	// Build log options
	logOptions := &corev1.PodLogOptions{
		Container:  container,
		Follow:     followBool,
		Timestamps: timestampsBool,
		TailLines:  &tail,
		Previous:   previousBool,
	}

	if sinceSeconds != "" {
		since, err := strconv.ParseInt(sinceSeconds, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sinceSeconds parameter"})
			return
		}
		logOptions.SinceSeconds = &since
	}

	// Get log stream
	req := cs.K8sClient.ClientSet.CoreV1().Pods(namespace).GetLogs(podName, logOptions)
	podLogs, err := req.Stream(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to get pod logs: %v", err)})
		return
	}
	defer func() {
		_ = podLogs.Close()
	}()

	if followBool {
		// Set SSE headers for streaming logs (follow=true)
		c.Header("Content-Type", "text/event-stream")
		c.Header("Cache-Control", "no-cache")
		c.Header("Connection", "keep-alive")
		c.Status(http.StatusOK)

		if _, err := c.Writer.WriteString("event: connected\ndata: {\"status\":\"connected\"}\n\n"); err != nil {
			return
		}
		c.Writer.Flush()

		scanner := bufio.NewScanner(podLogs)
		scanner.Buffer(make([]byte, 8*1024), 64*1024)

		for scanner.Scan() {
			line := scanner.Text()
			sseData := fmt.Sprintf("event: log\ndata: %s\n\n", line)
			if _, err := c.Writer.WriteString(sseData); err != nil {
				return
			}
			c.Writer.Flush()
		}

		if err := scanner.Err(); err != nil {
			errorData := fmt.Sprintf("event: error\ndata: %s\n\n", err.Error())
			_, _ = c.Writer.WriteString(errorData)
		}

		// Send close event
		if _, err := c.Writer.WriteString("event: close\ndata: {\"status\":\"closed\"}\n\n"); err != nil {
			return
		}
		c.Writer.Flush()
	} else {
		logs, err := io.ReadAll(podLogs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to read pod logs: %v", err)})
			return
		}

		logLines := strings.Split(string(logs), "\n")
		if len(logLines) > 0 && logLines[len(logLines)-1] == "" {
			logLines = logLines[:len(logLines)-1]
		}

		c.JSON(http.StatusOK, gin.H{
			"logs":      logLines,
			"container": container,
			"pod":       podName,
			"namespace": namespace,
		})
	}
}
