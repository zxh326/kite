package resources

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/kube"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// CRHandler handles API operations for Custom Resources based on CRD name
type CRHandler struct {
}

// NewCRHandler creates a new CRHandler
func NewCRHandler() *CRHandler {
	return &CRHandler{}
}

// getCRDByName retrieves the CRD definition by name
func (h *CRHandler) getCRDByName(ctx context.Context, client *kube.K8sClient, crdName string) (*apiextensionsv1.CustomResourceDefinition, error) {
	var crd apiextensionsv1.CustomResourceDefinition
	if err := client.Get(ctx, types.NamespacedName{Name: crdName}, &crd); err != nil {
		return nil, err
	}
	return &crd, nil
}

// getGVRFromCRD extracts GroupVersionResource from CRD
func (h *CRHandler) getGVRFromCRD(crd *apiextensionsv1.CustomResourceDefinition) schema.GroupVersionResource {
	// Use the first served version as default
	var version string
	for _, v := range crd.Spec.Versions {
		if v.Served {
			version = v.Name
			break
		}
	}

	return schema.GroupVersionResource{
		Group:    crd.Spec.Group,
		Version:  version,
		Resource: crd.Spec.Names.Plural,
	}
}

func (h *CRHandler) List(c *gin.Context) {
	crdName := c.Param("crd")
	if crdName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CRD name is required"})
		return
	}
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	ctx := c.Request.Context()

	// Get the CRD definition
	crd, err := h.getCRDByName(ctx, cs.K8sClient, crdName)
	if err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "CustomResourceDefinition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create GVR from CRD
	gvr := h.getGVRFromCRD(crd)

	// Create unstructured list object
	crList := &unstructured.UnstructuredList{}
	crList.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   gvr.Group,
		Version: gvr.Version,
		Kind:    crd.Spec.Names.ListKind,
	})

	opts := &client.ListOptions{}

	// Handle namespace parameter for namespaced resources
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		namespace := c.Param("namespace")
		if namespace != "" && namespace != "_all" {
			opts.Namespace = namespace
		}
	}

	if err := cs.K8sClient.List(ctx, crList, opts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, crList)
}

func (h *CRHandler) Get(c *gin.Context) {
	crdName := c.Param("crd")
	name := c.Param("name")

	if crdName == "" || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CRD name and resource name are required"})
		return
	}

	cs := c.MustGet("cluster").(*cluster.ClientSet)
	ctx := c.Request.Context()

	// Get the CRD definition
	crd, err := h.getCRDByName(ctx, cs.K8sClient, crdName)
	if err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "CustomResourceDefinition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create GVR from CRD
	gvr := h.getGVRFromCRD(crd)

	// Create unstructured object
	cr := &unstructured.Unstructured{}
	cr.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   gvr.Group,
		Version: gvr.Version,
		Kind:    crd.Spec.Names.Kind,
	})

	var namespacedName types.NamespacedName
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		namespace := c.Param("namespace")
		// Handle both regular namespace and _all routing
		if namespace == "_all" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "This custom resource is namespace-scoped, use /:crd/:namespace/:name endpoint"})
			return
		}
		if namespace == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "namespace is required for namespaced custom resources"})
			return
		}
		namespacedName = types.NamespacedName{Namespace: namespace, Name: name}
	} else {
		// For cluster-scoped resources, ignore namespace parameter
		namespacedName = types.NamespacedName{Name: name}
	}

	if err := cs.K8sClient.Get(ctx, namespacedName, cr); err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Custom resource not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, cr)
}

func (h *CRHandler) Create(c *gin.Context) {
	crdName := c.Param("crd")
	if crdName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CRD name is required"})
		return
	}
	ctx := c.Request.Context()
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	// Get the CRD definition
	crd, err := h.getCRDByName(ctx, cs.K8sClient, crdName)
	if err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "CustomResourceDefinition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create GVR from CRD
	gvr := h.getGVRFromCRD(crd)

	// Parse the request body into unstructured object
	var cr unstructured.Unstructured
	if err := c.ShouldBindJSON(&cr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set correct GVK
	cr.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   gvr.Group,
		Version: gvr.Version,
		Kind:    crd.Spec.Names.Kind,
	})

	// Set namespace for namespaced resources
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		namespace := c.Param("namespace")
		if namespace == "_all" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "This custom resource is namespace-scoped, use /:crd/:namespace endpoint"})
			return
		}
		if namespace == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "namespace is required for namespaced custom resources"})
			return
		}
		cr.SetNamespace(namespace)
	}

	if err := cs.K8sClient.Create(ctx, &cr); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cr)
}

func (h *CRHandler) Update(c *gin.Context) {
	crdName := c.Param("crd")
	name := c.Param("name")

	if crdName == "" || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CRD name and resource name are required"})
		return
	}

	cs := c.MustGet("cluster").(*cluster.ClientSet)
	ctx := c.Request.Context()

	// Get the CRD definition
	crd, err := h.getCRDByName(ctx, cs.K8sClient, crdName)
	if err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "CustomResourceDefinition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create GVR from CRD
	gvr := h.getGVRFromCRD(crd)

	// First get the existing custom resource
	existingCR := &unstructured.Unstructured{}
	existingCR.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   gvr.Group,
		Version: gvr.Version,
		Kind:    crd.Spec.Names.Kind,
	})

	var namespacedName types.NamespacedName
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		namespace := c.Param("namespace")
		if namespace == "_all" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "This custom resource is namespace-scoped, use /:crd/:namespace/:name endpoint"})
			return
		}
		if namespace == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "namespace is required for namespaced custom resources"})
			return
		}
		namespacedName = types.NamespacedName{Namespace: namespace, Name: name}
	} else {
		namespacedName = types.NamespacedName{Name: name}
	}

	if err := cs.K8sClient.Get(ctx, namespacedName, existingCR); err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Custom resource not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse the request body into unstructured object
	var updatedCR unstructured.Unstructured
	if err := c.ShouldBindJSON(&updatedCR); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Preserve important metadata
	updatedCR.SetGroupVersionKind(existingCR.GroupVersionKind())
	updatedCR.SetName(name)
	updatedCR.SetResourceVersion(existingCR.GetResourceVersion())
	updatedCR.SetUID(existingCR.GetUID())

	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		updatedCR.SetNamespace(existingCR.GetNamespace())
	}

	if err := cs.K8sClient.Update(ctx, &updatedCR); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, updatedCR)
}

func (h *CRHandler) Delete(c *gin.Context) {
	crdName := c.Param("crd")
	name := c.Param("name")

	if crdName == "" || name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CRD name and resource name are required"})
		return
	}

	ctx := c.Request.Context()
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	// Get the CRD definition
	crd, err := h.getCRDByName(ctx, cs.K8sClient, crdName)
	if err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "CustomResourceDefinition not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Create GVR from CRD
	gvr := h.getGVRFromCRD(crd)

	// Create unstructured object to delete
	cr := &unstructured.Unstructured{}
	cr.SetGroupVersionKind(schema.GroupVersionKind{
		Group:   gvr.Group,
		Version: gvr.Version,
		Kind:    crd.Spec.Names.Kind,
	})

	var namespacedName types.NamespacedName
	if crd.Spec.Scope == apiextensionsv1.NamespaceScoped {
		namespace := c.Param("namespace")
		if namespace == "_all" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "This custom resource is namespace-scoped, use /:crd/:namespace/:name endpoint"})
			return
		}
		if namespace == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "namespace is required for namespaced custom resources"})
			return
		}
		namespacedName = types.NamespacedName{Namespace: namespace, Name: name}
		cr.SetNamespace(namespace)
	} else {
		namespacedName = types.NamespacedName{Name: name}
	}
	cr.SetName(name)

	// First check if the resource exists
	if err := cs.K8sClient.Get(ctx, namespacedName, cr); err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Custom resource not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Delete the custom resource
	if err := cs.K8sClient.Delete(ctx, cr, &client.DeleteOptions{
		PropagationPolicy: &[]metav1.DeletionPropagation{metav1.DeletePropagationForeground}[0],
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Custom resource deleted successfully"})
}
