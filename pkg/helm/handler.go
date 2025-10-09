package helm

// import (
// 	"fmt"
// 	"net/http"
// 	"strconv"

// 	"github.com/gin-gonic/gin"
// 	"github.com/zxh326/kite/pkg/cluster"
// 	"k8s.io/client-go/dynamic"
// 	"k8s.io/client-go/kubernetes"
// 	"k8s.io/klog/v2"
// )

// type Handler struct {
// }

// func NewHandler() *Handler {
// 	return &Handler{}
// }

// func (h *Handler) getClients(c *gin.Context) (dynamic.Interface, kubernetes.Interface, error) {
// 	clusterInterface, exists := c.Get("cluster")
// 	if !exists {
// 		return nil, nil, fmt.Errorf("cluster not found in context")
// 	}

// 	cluster, ok := clusterInterface.(*cluster.ClientSet)
// 	if !ok {
// 		return nil, nil, fmt.Errorf("invalid cluster type in context")
// 	}

// 	dynamicClient, err := dynamic.NewForConfig(cluster.K8sClient.Configuration)
// 	if err != nil {
// 		return nil, nil, fmt.Errorf("failed to create dynamic client: %w", err)
// 	}

// 	return dynamicClient, cluster.K8sClient.ClientSet, nil
// }

// func (h *Handler) ListReleases(c *gin.Context) {
// 	namespace := c.Param("namespace")

// 	dynamicClient, kubeClient, err := h.getClients(c)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	manager := NewManager(dynamicClient, kubeClient)
// 	releases, err := manager.ListReleases(namespace)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, releases)
// }

// func (h *Handler) GetRelease(c *gin.Context) {
// 	namespace := c.Param("namespace")
// 	name := c.Param("name")

// 	dynamicClient, kubeClient, err := h.getClients(c)
// 	if err != nil {
// 		klog.Errorf("Failed to get clients: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	manager := NewManager(dynamicClient, kubeClient)
// 	release, err := manager.GetRelease(namespace, name)
// 	if err != nil {
// 		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
// 		return
// 	}
// 	c.JSON(http.StatusOK, release)
// }

// func (h *Handler) UpdateReleaseValues(c *gin.Context) {
// 	namespace := c.Param("namespace")
// 	name := c.Param("name")

// 	var req struct {
// 		Values map[string]interface{} `json:"values"`
// 	}

// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
// 		return
// 	}

// 	dynamicClient, kubeClient, err := h.getClients(c)
// 	if err != nil {
// 		klog.Errorf("Failed to get clients: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	manager := NewManager(dynamicClient, kubeClient)
// 	err = manager.UpdateReleaseValues(namespace, name, req.Values)
// 	if err != nil {
// 		klog.Errorf("Failed to update helm release values %s/%s: %v", namespace, name, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, gin.H{"message": "Release values updated successfully"})
// }

// func (h *Handler) UninstallRelease(c *gin.Context) {
// 	namespace := c.Param("namespace")
// 	name := c.Param("name")

// 	dynamicClient, kubeClient, err := h.getClients(c)
// 	if err != nil {
// 		klog.Errorf("Failed to get clients: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	manager := NewManager(dynamicClient, kubeClient)
// 	err = manager.UninstallRelease(namespace, name)
// 	if err != nil {
// 		klog.Errorf("Failed to uninstall helm release %s/%s: %v", namespace, name, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, gin.H{"message": "Release uninstalled successfully"})
// }

// func (h *Handler) GetReleaseHistory(c *gin.Context) {
// 	namespace := c.Param("namespace")
// 	name := c.Param("name")

// 	dynamicClient, kubeClient, err := h.getClients(c)
// 	if err != nil {
// 		klog.Errorf("Failed to get clients: %v", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	manager := NewManager(dynamicClient, kubeClient)
// 	history, err := manager.GetReleaseHistory(namespace, name)
// 	if err != nil {
// 		klog.Errorf("Failed to get helm release history %s/%s: %v", namespace, name, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, gin.H{"history": history})
// }

// func (h *Handler) RollbackRelease(c *gin.Context) {
// 	namespace := c.Param("namespace")
// 	name := c.Param("name")

// 	var req struct {
// 		Revision int `json:"revision"`
// 	}

// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		revisionStr := c.Query("revision")
// 		if revisionStr == "" {
// 			c.JSON(http.StatusBadRequest, gin.H{"error": "Revision is required"})
// 			return
// 		}

// 		var err error
// 		req.Revision, err = strconv.Atoi(revisionStr)
// 		if err != nil {
// 			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid revision number"})
// 			return
// 		}
// 	}

// 	manager := NewManager(kubeClient)
// 	err = manager.RollbackRelease(namespace, name, req.Revision)
// 	if err != nil {
// 		klog.Errorf("Failed to rollback helm release %s/%s to revision %d: %v", namespace, name, req.Revision, err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, gin.H{"message": "Release rollback completed successfully"})
// }
