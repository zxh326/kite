package resources

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/helm"
	helmv3 "github.com/zxh326/kite/pkg/helm/types/v3"
	"k8s.io/klog/v2"
)

type HelmReleaseHandler struct {
}

func (h *HelmReleaseHandler) Create(c *gin.Context)   {}
func (h *HelmReleaseHandler) Describe(c *gin.Context) {}
func (h *HelmReleaseHandler) Searchable() bool        { return false }
func (h *HelmReleaseHandler) IsClusterScoped() bool   { return false }
func (h *HelmReleaseHandler) ListHistory(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	manager := helm.NewManager(cs.K8sClient.ClientSet)
	history, err := manager.GetReleaseHistory(namespace, name)
	if err != nil {
		klog.Errorf("Failed to get helm release history %s/%s: %v", namespace, name, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, history)
}
func (h *HelmReleaseHandler) registerCustomRoutes(group *gin.RouterGroup) {
	group.POST("/:namespace/:name/rollback", h.Rollback)
}

func (h *HelmReleaseHandler) Rollback(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	var req struct {
		Revision int `json:"revision" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: revision is required"})
		return
	}

	cs := c.MustGet("cluster").(*cluster.ClientSet)
	manager := helm.NewManager(cs.K8sClient.ClientSet)

	err := manager.RollbackRelease(namespace, name, req.Revision)
	if err != nil {
		klog.Errorf("Failed to rollback helm release %s/%s to revision %d: %v", namespace, name, req.Revision, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Release rolled back successfully"})
}
func (h *HelmReleaseHandler) Search(c *gin.Context, query string, limit int64) ([]common.SearchResult, error) {
	return nil, nil
}
func (h *HelmReleaseHandler) GetResource(c *gin.Context, namespace string, name string) (interface{}, error) {
	return nil, nil
}

func (h *HelmReleaseHandler) Delete(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	manager := helm.NewManager(cs.K8sClient.ClientSet)
	err := manager.UninstallRelease(namespace, name)
	if err != nil {
		klog.Errorf("Failed to uninstall helm release %s/%s: %v", namespace, name, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Release uninstalled successfully"})
}

func (h *HelmReleaseHandler) Update(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")

	var release helmv3.HelmRelease
	if err := c.ShouldBindJSON(&release); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	cs := c.MustGet("cluster").(*cluster.ClientSet)
	manager := helm.NewManager(cs.K8sClient.ClientSet)

	err := manager.UpdateReleaseValues(namespace, name, release.Spec.Values)
	if err != nil {
		klog.Errorf("Failed to update helm release values %s/%s: %v", namespace, name, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Release values updated successfully"})
}

func (h *HelmReleaseHandler) Get(c *gin.Context) {
	namespace := c.Param("namespace")
	name := c.Param("name")
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	manager := helm.NewManager(cs.K8sClient.ClientSet)
	release, err := manager.GetRelease(namespace, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, release)
}

func (h *HelmReleaseHandler) List(c *gin.Context) {
	namespace := c.Param("namespace")
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	manager := helm.NewManager(cs.K8sClient.ClientSet)
	releases, err := manager.ListReleases(namespace)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, releases)
}

var _ resourceHandler = &HelmReleaseHandler{}

func NewHelmReleaseHandler() *HelmReleaseHandler {
	return &HelmReleaseHandler{}
}
