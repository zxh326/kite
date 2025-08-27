package handlers

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/kube"
	"github.com/zxh326/kite/pkg/model"
	"github.com/zxh326/kite/pkg/rbac"
	"golang.org/x/net/websocket"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type LogsHandler struct {
}

func NewLogsHandler() *LogsHandler {
	return &LogsHandler{}
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

		labelSelector := c.Query("labelSelector")
		pods := make([]corev1.Pod, 0)
		if podName == "_all" && labelSelector != "" {
			selector, err := metav1.ParseToLabelSelector(labelSelector)
			if err != nil {
				_ = sendErrorMessage(ws, "invalid labelSelector parameter: "+err.Error())
				return
			}
			labelSelectorOption, err := metav1.LabelSelectorAsSelector(selector)
			if err != nil {
				_ = sendErrorMessage(ws, "failed to convert labelSelector: "+err.Error())
				return
			}

			podList := &corev1.PodList{}
			var listOpts []client.ListOption
			listOpts = append(listOpts, client.InNamespace(namespace))
			listOpts = append(listOpts, client.MatchingLabelsSelector{Selector: labelSelectorOption})
			if err := cs.K8sClient.List(ctx, podList, listOpts...); err != nil {
				_ = sendErrorMessage(ws, "failed to list pods: "+err.Error())
				return
			}
			if len(podList.Items) == 0 {
				_ = sendErrorMessage(ws, "no pods found matching labelSelector")
				return
			}
			pods = append(pods, podList.Items...)
		} else {
			pods = append(pods, corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      podName,
					Namespace: namespace,
				},
			})
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

		bl := kube.NewBatchLogHandler(ws, pods)
		bl.StreamLogs(ctx, cs.K8sClient, logOptions)
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
