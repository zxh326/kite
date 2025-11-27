package resources

import (
	"net/http"
	"sort"

	tykov1alpha1 "github.com/akyriako/typesense-operator/api/v1alpha1"
	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/model"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type TypesenseClusterHandler struct {
	*GenericResourceHandler[*tykov1alpha1.TypesenseCluster, *tykov1alpha1.TypesenseClusterList]
}

func NewTypesenseClusterHandler() *TypesenseClusterHandler {
	return &TypesenseClusterHandler{
		GenericResourceHandler: NewGenericResourceHandler[*tykov1alpha1.TypesenseCluster, *tykov1alpha1.TypesenseClusterList](
			"typesenseclusters",
			false, // TypesenseClusters are namespaced resources
			true,
		),
	}
}

func (h *TypesenseClusterHandler) List(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	user := c.MustGet("user").(model.User)
	if len(user.Roles) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
	}

	// Parse params
	reduce := c.DefaultQuery("reduce", "true") == "true"

	namespace := c.Param("namespace")
	if namespace == "" {
		namespace = "_all"
	}

	ns := namespace
	if ns == "_all" {
		ns = ""
	}

	clusters := &tykov1alpha1.TypesenseClusterList{}
	if err := cs.K8sClient.List(c, clusters, &client.ListOptions{Namespace: ns}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if reduce {
		for i := range clusters.Items {
			clusters.Items[i].ObjectMeta.ManagedFields = nil
		}
	}

	sort.SliceStable(clusters.Items, func(i, j int) bool {
		if clusters.Items[i].Namespace == clusters.Items[j].Namespace {
			return clusters.Items[i].Name < clusters.Items[j].Name
		}
		return clusters.Items[i].Namespace < clusters.Items[j].Namespace
	})

	c.JSON(http.StatusOK, clusters)
}

func (h *TypesenseClusterHandler) registerCustomRoutes(group *gin.RouterGroup) {
	group.POST("/_all", h.List)
}
