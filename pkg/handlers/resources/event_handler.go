package resources

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/kube"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type EventHandler struct {
	GenericResourceHandler[*corev1.Event, *corev1.EventList]
}

func NewEventHandler(k8sClient *kube.K8sClient) *EventHandler {
	return &EventHandler{
		GenericResourceHandler: *NewGenericResourceHandler[*corev1.Event, *corev1.EventList](
			k8sClient,
			"events",
			false,
			false,
		),
	}
}

func (h *EventHandler) ListResourceEvents(c *gin.Context) {
	name := c.Query("name")
	namespace := c.Query("namespace")
	resource := c.Query("resource")

	target, err := GetResource(c.Request.Context(), resource, namespace, name)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Failed to get resource: " + err.Error()})
		return
	}

	objType, err := meta.TypeAccessor(target)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to access object type info: " + err.Error()})
		return
	}
	obj := target.(metav1.Object)
	events, err := h.K8sClient.ClientSet.CoreV1().Events(obj.GetNamespace()).List(c.Request.Context(), metav1.ListOptions{
		FieldSelector: "involvedObject.kind=" + objType.GetKind() +
			",involvedObject.apiVersion=" + objType.GetAPIVersion() +
			",involvedObject.name=" + name,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list events: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, events)
}

func (h *EventHandler) registerCustomRoutes(group *gin.RouterGroup) {
	group.GET("/resources", h.ListResourceEvents)
}
