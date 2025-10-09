package resources

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/helm"
)

type HelmReleaseHandler struct {
}

func (h *HelmReleaseHandler) Create(c *gin.Context)                       {}
func (h *HelmReleaseHandler) Delete(c *gin.Context)                       {}
func (h *HelmReleaseHandler) Update(c *gin.Context)                       {}
func (h *HelmReleaseHandler) Describe(c *gin.Context)                     {}
func (h *HelmReleaseHandler) Searchable() bool                            { return false }
func (h *HelmReleaseHandler) IsClusterScoped() bool                       { return false }
func (h *HelmReleaseHandler) ListHistory(c *gin.Context)                  {}
func (h *HelmReleaseHandler) registerCustomRoutes(group *gin.RouterGroup) {}
func (h *HelmReleaseHandler) Search(c *gin.Context, query string, limit int64) ([]common.SearchResult, error) {
	return nil, nil
}
func (h *HelmReleaseHandler) GetResource(c *gin.Context, namespace string, name string) (interface{}, error) {
	return nil, nil
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
