package kube

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"

	"golang.org/x/net/websocket"
	corev1 "k8s.io/api/core/v1"
)

type BatchLogHandler struct {
	conn *websocket.Conn
	pods []corev1.Pod
}

func NewBatchLogHandler(conn *websocket.Conn, pods []corev1.Pod) *BatchLogHandler {
	l := &BatchLogHandler{
		conn: conn,
		pods: pods,
	}
	return l
}

func (l *BatchLogHandler) StreamLogs(ctx context.Context, k8sClient *K8sClient, opts *corev1.PodLogOptions) {
	wg := sync.WaitGroup{}
	for _, pod := range l.pods {
		wg.Add(1)
		go func(pod corev1.Pod) {
			defer wg.Done()
			req := k8sClient.ClientSet.CoreV1().Pods(pod.Namespace).GetLogs(pod.Name, opts)
			podLogs, err := req.Stream(ctx)
			if err != nil {
				_ = sendErrorMessage(l.conn, fmt.Sprintf("Failed to get pod logs: %v", err))
				return
			}
			defer func() {
				_ = podLogs.Close()
			}()
			if err := sendMessage(l.conn, "connected", "{\"status\":\"connected\"}"); err != nil {
				return
			}
			prefix := ""
			if len(l.pods) > 1 {
				prefix = fmt.Sprintf("[%s]: ", pod.Name)
			}
			lw := NewLogWriter(prefix, "", l.conn)
			_, err = io.Copy(lw, podLogs)
			if err != nil && !errors.Is(err, io.EOF) {
				_ = sendErrorMessage(l.conn, fmt.Sprintf("Failed to stream pod logs: %v", err))
			}
			_ = sendMessage(l.conn, "close", "{\"status\":\"closed\"}")

		}(pod)
	}
	go l.heartbeat(ctx)
	wg.Wait()
}

func (l *BatchLogHandler) heartbeat(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		default:
			var temp []byte
			err := websocket.Message.Receive(l.conn, &temp)
			if err != nil {
				return
			}
			if strings.Contains(string(temp), "ping") {
				err = sendMessage(l.conn, "pong", "pong")
				if err != nil {
					return
				}
			}
		}
	}
}

var _ io.Writer = &LogWriter{}

type LogWriter struct {
	prefix    string
	ansiColor string
	conn      *websocket.Conn
}

func NewLogWriter(prefix string, ansiColor string, conn *websocket.Conn) *LogWriter {
	return &LogWriter{
		prefix:    prefix,
		ansiColor: ansiColor,
		conn:      conn,
	}
}
func (l *LogWriter) Write(p []byte) (int, error) {
	logString := string(p)
	logLines := strings.SplitSeq(logString, "\n")
	for line := range logLines {
		if line == "" {
			continue
		}
		if l.prefix != "" {
			line = fmt.Sprintf("%s%s", l.prefix, line)
		}
		err := sendMessage(l.conn, "log", line)
		if err != nil {
			return 0, err
		}
	}

	return len(p), nil
}

type LogsMessage struct {
	Type string `json:"type"` // "log", "error", "connected", "close"
	Data string `json:"data"`
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
