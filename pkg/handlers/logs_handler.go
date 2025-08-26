package handlers

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/model"
	"github.com/zxh326/kite/pkg/rbac"
	"golang.org/x/net/websocket"
	corev1 "k8s.io/api/core/v1"
)

type LogsHandler struct {
}

func NewLogsHandler() *LogsHandler {
	return &LogsHandler{}
}

type LogReadWriter struct {
	conn   *websocket.Conn
	stream io.ReadCloser
}

func NewLogReadWriter(ctx context.Context, conn *websocket.Conn, stream io.ReadCloser) *LogReadWriter {
	l := &LogReadWriter{
		conn:   conn,
		stream: stream,
	}
	go func() {
		for {
			select {
			case <-ctx.Done():
				_ = l.stream.Close()
				return
			default:
				var temp []byte
				err := websocket.Message.Receive(l.conn, &temp)
				if err != nil {
					_ = l.stream.Close()
					return
				}
				if strings.Contains(string(temp), "ping") {
					err = sendMessage(l.conn, "pong", "pong")
					if err != nil {
						_ = l.stream.Close()
						return
					}
				}
			}
		}
	}()
	return l
}

func (l *LogReadWriter) Write(p []byte) (int, error) {
	logString := string(p)
	logLines := strings.SplitSeq(logString, "\n")
	for line := range logLines {
		if line == "" {
			continue
		}
		err := sendMessage(l.conn, "log", line)
		if err != nil {
			return 0, err
		}
	}

	return len(p), nil
}

func (l *LogReadWriter) Read(p []byte) (int, error) {
	return l.stream.Read(p)
}

type LogsMessage struct {
	Type string `json:"type"` // "log", "error", "connected", "close"
	Data string `json:"data"`
}

// HandleLogsWebSocket handles WebSocket connections for log streaming
func (h *LogsHandler) HandleLogsWebSocket(c *gin.Context) {
	websocket.Handler(func(ws *websocket.Conn) {
		ctx, cancel := context.WithCancel(c.Request.Context())
		defer cancel()
		cs := c.MustGet("cluster").(*cluster.ClientSet)
		user := c.MustGet("user").(model.User)
		namespace := c.Param("namespace")
		podName := c.Param("podName")
		if namespace == "" || podName == "" {
			_ = sendErrorMessage(ws, "namespace and podName are required")
			return
		}

		if !rbac.CanAccess(user, "pods", "log", cs.Name, namespace) {
			_ = sendErrorMessage(ws, rbac.NoAccess(user.Key(), string(common.VerbLog), "pods", namespace, cs.Name))
			return
		}

		container := c.Query("container")
		tailLines := c.DefaultQuery("tailLines", "100")
		timestamps := c.DefaultQuery("timestamps", "true")
		previous := c.DefaultQuery("previous", "false")
		sinceSeconds := c.Query("sinceSeconds")

		tail, err := strconv.ParseInt(tailLines, 10, 64)
		if err != nil {
			_ = sendErrorMessage(ws, "invalid tailLines parameter")
			return
		}

		timestampsBool := timestamps == "true"
		previousBool := previous == "true"

		// Build log options
		logOptions := &corev1.PodLogOptions{
			Container:  container,
			Follow:     true,
			Timestamps: timestampsBool,
			TailLines:  &tail,
			Previous:   previousBool,
		}

		if sinceSeconds != "" {
			since, err := strconv.ParseInt(sinceSeconds, 10, 64)
			if err != nil {
				_ = sendErrorMessage(ws, "invalid sinceSeconds parameter")
				return
			}
			logOptions.SinceSeconds = &since
		}

		req := cs.K8sClient.ClientSet.CoreV1().Pods(namespace).GetLogs(podName, logOptions)
		podLogs, err := req.Stream(ctx)
		if err != nil {
			_ = sendErrorMessage(ws, fmt.Sprintf("Failed to get pod logs: %v", err))
			return
		}
		defer func() {
			_ = podLogs.Close()
		}()

		if err := sendMessage(ws, "connected", "{\"status\":\"connected\"}"); err != nil {
			return
		}

		lrw := NewLogReadWriter(ctx, ws, podLogs)
		_, err = io.Copy(lrw, lrw)
		if err != nil && !errors.Is(err, io.EOF) {
			_ = sendErrorMessage(ws, err.Error())
		}

		_ = sendMessage(ws, "close", "{\"status\":\"closed\"}")
	}).ServeHTTP(c.Writer, c.Request)
}

func sendMessage(ws *websocket.Conn, msgType, data string) error {
	msg := LogsMessage{
		Type: msgType,
		Data: data,
	}
	if err := websocket.JSON.Send(ws, msg); err != nil {
		return err
	}
	return nil
}

func sendErrorMessage(ws *websocket.Conn, errMsg string) error {
	return sendMessage(ws, "error", errMsg)
}
