package resources

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
)

type DeploymentHandler struct {
	*GenericResourceHandler[*appsv1.Deployment, *appsv1.DeploymentList]
}

func NewDeploymentHandler() *DeploymentHandler {
	return &DeploymentHandler{
		GenericResourceHandler: NewGenericResourceHandler[*appsv1.Deployment, *appsv1.DeploymentList](
			"deployments",
			false, // Deployments are namespaced resources
			true,
		),
	}
}

func (h *DeploymentHandler) Restart(c *gin.Context, namespace, name string) error {
	var deployment appsv1.Deployment
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	if err := cs.K8sClient.Get(c.Request.Context(), types.NamespacedName{Namespace: namespace, Name: name}, &deployment); err != nil {
		return err
	}
	if deployment.Spec.Template.Annotations == nil {
		deployment.Spec.Template.Annotations = make(map[string]string)
	}
	deployment.Spec.Template.Annotations["kite.kubernetes.io/restartedAt"] = time.Now().Format(time.RFC3339)
	return cs.K8sClient.Update(c.Request.Context(), &deployment)
}

func (h *DeploymentHandler) RestartDeployment(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	if err := h.Restart(c, namespace, name); err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restart deployment: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Deployment restarted successfully",
	})
}

// ScaleDeployment scales a deployment to the specified number of replicas
func (h *DeploymentHandler) ScaleDeployment(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	ctx := c.Request.Context()
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	// Parse the request body to get the desired replica count
	var scaleRequest struct {
		Replicas *int32 `json:"replicas" binding:"required,min=0"`
	}

	if err := c.ShouldBindJSON(&scaleRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if scaleRequest.Replicas == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "replicas field is required"})
		return
	}

	// Get the current deployment
	var deployment appsv1.Deployment
	if err := cs.K8sClient.Get(ctx, types.NamespacedName{Namespace: namespace, Name: name}, &deployment); err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Deployment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Update the replica count
	deployment.Spec.Replicas = scaleRequest.Replicas

	// Update the deployment
	if err := cs.K8sClient.Update(ctx, &deployment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scale deployment: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Deployment scaled successfully",
		"deployment": deployment,
		"replicas":   *scaleRequest.Replicas,
	})
}

func (h *DeploymentHandler) registerCustomRoutes(group *gin.RouterGroup) {
	group.PUT("/:namespace/:name/scale", h.ScaleDeployment)
	group.PUT("/:namespace/:name/restart", h.RestartDeployment)
}
