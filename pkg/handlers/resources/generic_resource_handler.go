package resources

import (
	"net/http"
	"reflect"
	"sort"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type GenericResourceHandler[T client.Object, V client.ObjectList] struct {
	name            string
	isClusterScoped bool
	objectType      reflect.Type
	listType        reflect.Type
	enableSearch    bool
}

func NewGenericResourceHandler[T client.Object, V client.ObjectList](
	name string,
	isClusterScoped bool,
	enableSearch bool,
) *GenericResourceHandler[T, V] {
	var obj T
	var list V

	return &GenericResourceHandler[T, V]{
		name:            name,
		isClusterScoped: isClusterScoped,
		enableSearch:    enableSearch,
		objectType:      reflect.TypeOf(obj).Elem(),
		listType:        reflect.TypeOf(list).Elem(),
	}
}

func (h *GenericResourceHandler[T, V]) IsClusterScoped() bool {
	return h.isClusterScoped
}

func (h *GenericResourceHandler[T, V]) Name() string {
	return h.name
}

func (h *GenericResourceHandler[T, V]) Searchable() bool {
	return h.enableSearch
}

func (h *GenericResourceHandler[T, V]) GetResource(c *gin.Context, namespace, name string) (interface{}, error) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	object := reflect.New(h.objectType).Interface().(T)
	namespacedName := types.NamespacedName{Name: name}
	if !h.isClusterScoped {
		if namespace != "" && namespace != "_all" {
			namespacedName.Namespace = namespace
		}
	}
	if err := cs.K8sClient.Get(c.Request.Context(), namespacedName, object); err != nil {
		return nil, err
	}
	return object, nil
}

func (h *GenericResourceHandler[T, V]) Get(c *gin.Context) {
	object, err := h.GetResource(c, c.Param("namespace"), c.Param("name"))
	if err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	obj, err := meta.Accessor(object)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to access object metadata"})
		return
	}
	obj.SetManagedFields(nil)
	anno := obj.GetAnnotations()
	if anno != nil {
		delete(anno, "kubectl.kubernetes.io/last-applied-configuration")
	}

	c.JSON(http.StatusOK, object)
}

func (h *GenericResourceHandler[T, V]) List(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	objectList := reflect.New(h.listType).Interface().(V)

	ctx := c.Request.Context()

	var listOpts []client.ListOption
	if !h.isClusterScoped {
		namespace := c.Param("namespace")
		if namespace != "" && namespace != "_all" {
			listOpts = append(listOpts, client.InNamespace(namespace))
		}
	}
	if c.Query("limit") != "" {
		limit, err := strconv.ParseInt(c.Query("limit"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid limit parameter"})
			return
		}
		listOpts = append(listOpts, client.Limit(limit))
	}

	if c.Query("continue") != "" {
		continueToken := c.Query("continue")
		listOpts = append(listOpts, client.Continue(continueToken))
	}

	// Add label selector support
	if c.Query("labelSelector") != "" {
		labelSelector := c.Query("labelSelector")
		selector, err := metav1.ParseToLabelSelector(labelSelector)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid labelSelector parameter: " + err.Error()})
			return
		}
		labelSelectorOption, err := metav1.LabelSelectorAsSelector(selector)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to convert labelSelector: " + err.Error()})
			return
		}
		listOpts = append(listOpts, client.MatchingLabelsSelector{Selector: labelSelectorOption})
	}

	if c.Query("fieldSelector") != "" {
		fieldSelector := c.Query("fieldSelector")
		fieldSelectorOption, err := fields.ParseSelector(fieldSelector)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid fieldSelector parameter: " + err.Error()})
			return
		}
		listOpts = append(listOpts, client.MatchingFieldsSelector{Selector: fieldSelectorOption})
	}

	if err := cs.K8sClient.List(ctx, objectList, listOpts...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Sort by creation timestamp in descending order (newest first)
	// Extract items using reflection and sort them directly

	items, err := meta.ExtractList(objectList)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to extract items from list"})
		return
	}
	sort.Slice(items, func(i, j int) bool {
		o1, _ := meta.Accessor(items[i])
		o2, _ := meta.Accessor(items[j])
		if o1 == nil || o2 == nil {
			return false // Handle nil cases gracefully
		}

		t1 := o1.GetCreationTimestamp()
		t2 := o2.GetCreationTimestamp()
		if t1.Equal(&t2) {
			return o1.GetName() < o2.GetName()
		}

		return t1.After(t2.Time)
	})
	_ = meta.SetList(objectList, items)

	c.JSON(http.StatusOK, objectList)
}

func (h *GenericResourceHandler[T, V]) Create(c *gin.Context) {
	resource := reflect.New(h.objectType).Interface().(T)
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	if err := c.ShouldBindJSON(resource); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	if err := cs.K8sClient.Create(ctx, resource); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resource)
}

func (h *GenericResourceHandler[T, V]) Update(c *gin.Context) {
	name := c.Param("name")
	resource := reflect.New(h.objectType).Interface().(T)
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	if err := c.ShouldBindJSON(resource); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	resource.SetName(name)
	if !h.isClusterScoped {
		namespace := c.Param("namespace")
		if namespace != "" && namespace != "_all" {
			resource.SetNamespace(namespace)
		}
	}

	ctx := c.Request.Context()
	if err := cs.K8sClient.Update(ctx, resource); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resource)
}

func (h *GenericResourceHandler[T, V]) Delete(c *gin.Context) {
	name := c.Param("name")
	resource := reflect.New(h.objectType).Interface().(T)
	cs := c.MustGet("cluster").(*cluster.ClientSet)

	namespacedName := types.NamespacedName{Name: name}
	if !h.isClusterScoped {
		namespace := c.Param("namespace")
		if namespace != "" && namespace != "_all" {
			namespacedName.Namespace = namespace
		}
	}

	ctx := c.Request.Context()

	if err := cs.K8sClient.Get(ctx, namespacedName, resource); err != nil {
		if errors.IsNotFound(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Check if we should cascade delete
	cascadeDelete := c.Query("cascade") != "false"

	// Set propagation policy based on the cascadeDelete flag
	deleteOptions := &client.DeleteOptions{}
	if cascadeDelete {
		propagationPolicy := metav1.DeletePropagationForeground
		deleteOptions.PropagationPolicy = &propagationPolicy
	} else {
		propagationPolicy := metav1.DeletePropagationOrphan
		deleteOptions.PropagationPolicy = &propagationPolicy
	}

	if err := cs.K8sClient.Delete(ctx, resource, deleteOptions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted successfully"})
}

func (h *GenericResourceHandler[T, V]) Search(c *gin.Context, q string, limit int64) ([]common.SearchResult, error) {
	if !h.enableSearch || len(q) < 3 {
		return nil, nil
	}
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	ctx := c.Request.Context()
	objectList := reflect.New(h.listType).Interface().(V)
	if err := cs.K8sClient.List(ctx, objectList); err != nil {
		klog.Errorf("failed to list %s: %v", h.name, err)
		return nil, err
	}
	items, err := meta.ExtractList(objectList)
	if err != nil {
		klog.Errorf("failed to extract items from list: %v", err)
		return nil, err
	}

	results := make([]common.SearchResult, 0, limit)

	for _, item := range items {
		obj, ok := item.(client.Object)
		if !ok {
			klog.Errorf("item is not a client.Object: %v", item)
			continue
		}
		if !strings.Contains(strings.ToLower(obj.GetName()), strings.ToLower(q)) {
			continue
		}
		result := common.SearchResult{
			ID:           string(obj.GetUID()),
			Name:         obj.GetName(),
			Namespace:    obj.GetNamespace(),
			ResourceType: h.name,
			CreatedAt:    obj.GetCreationTimestamp().String(),
		}
		results = append(results, result)
		if limit > 0 && int64(len(results)) >= limit {
			break
		}
	}

	return results, nil
}

func (h *GenericResourceHandler[T, V]) registerCustomRoutes(group *gin.RouterGroup) {}
