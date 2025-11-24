package resources

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/model"
	appsv1 "k8s.io/api/apps/v1"
	"k8s.io/apimachinery/pkg/labels"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type TypesenseOperatorHandler struct {
	*GenericResourceHandler[*appsv1.Deployment, *appsv1.DeploymentList]
}

func NewTypesenseOperatorHandler() *TypesenseOperatorHandler {
	return &TypesenseOperatorHandler{
		GenericResourceHandler: NewGenericResourceHandler[*appsv1.Deployment, *appsv1.DeploymentList](
			"deployments",
			false, // Deployments are namespaced resources
			true,
		),
	}
}

func (h *TypesenseOperatorHandler) List(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	user := c.MustGet("user").(model.User)
	if len(user.Roles) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
	}

	// Parse params
	namespace := c.Param("namespace")
	if namespace == "" {
		namespace = "_all"
	}
	//reduce := c.DefaultQuery("reduce", "false") == "true"
	labelSelector, err := labels.Parse("app.kubernetes.io/name=typesense-operator")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ns := namespace
	if ns == "_all" {
		ns = ""
	}

	deployments := &appsv1.DeploymentList{}
	if err := cs.K8sClient.List(c, deployments, &client.ListOptions{LabelSelector: labelSelector, Namespace: ns}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, deployments)
}

func (h *TypesenseOperatorHandler) registerCustomRoutes(group *gin.RouterGroup) {
	group.POST("/_all", h.List)
}
