package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/kube"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/serializer/yaml"
	"k8s.io/klog/v2"
)

type ResourceApplyHandler struct {
	K8sClient *kube.K8sClient
}

func NewResourceApplyHandler(k8sClient *kube.K8sClient) *ResourceApplyHandler {
	return &ResourceApplyHandler{
		K8sClient: k8sClient,
	}
}

type ApplyResourceRequest struct {
	YAML string `json:"yaml" binding:"required"`
}

// ApplyResource applies a YAML resource to the cluster
func (h *ResourceApplyHandler) ApplyResource(c *gin.Context) {
	var req ApplyResourceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Decode YAML into unstructured object
	decodeUniversal := yaml.NewDecodingSerializer(unstructured.UnstructuredJSONScheme)
	obj := &unstructured.Unstructured{}

	_, _, err := decodeUniversal.Decode([]byte(req.YAML), nil, obj)
	if err != nil {
		klog.Errorf("Failed to decode YAML: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid YAML format: " + err.Error()})
		return
	}

	ctx := c.Request.Context()

	// Try to create the resource
	if err := h.K8sClient.Client.Create(ctx, obj); err != nil {
		klog.Errorf("Failed to create resource: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create resource: " + err.Error()})
		return
	}

	klog.Infof("Successfully created resource: %s/%s", obj.GetKind(), obj.GetName())
	c.JSON(http.StatusCreated, gin.H{
		"message":   "Resource created successfully",
		"kind":      obj.GetKind(),
		"name":      obj.GetName(),
		"namespace": obj.GetNamespace(),
	})
}
