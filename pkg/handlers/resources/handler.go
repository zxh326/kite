package resources

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/common"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	discoveryv1 "k8s.io/api/discovery/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	storagev1 "k8s.io/api/storage/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	metricsv1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
)

type resourceHandler interface {
	List(c *gin.Context)
	Get(c *gin.Context)
	Create(c *gin.Context)
	Update(c *gin.Context)
	Delete(c *gin.Context)

	IsClusterScoped() bool
	Searchable() bool
	Search(c *gin.Context, query string, limit int64) ([]common.SearchResult, error)

	GetResource(c *gin.Context, namespace, name string) (interface{}, error)

	registerCustomRoutes(group *gin.RouterGroup)
}

type Restartable interface {
	Restart(c *gin.Context, namespace, name string) error
}

var handlers = map[string]resourceHandler{}

func RegisterRoutes(group *gin.RouterGroup) {
	// Note: All handlers now get the k8s client from gin context instead of being passed it during initialization
	// We pass nil as the k8sClient parameter since handlers will get it from context
	handlers = map[string]resourceHandler{
		"pods":                   NewGenericResourceHandler[*corev1.Pod, *corev1.PodList]("pods", false, true),
		"namespaces":             NewGenericResourceHandler[*corev1.Namespace, *corev1.NamespaceList]("namespaces", true, false),
		"nodes":                  NewNodeHandler(),
		"services":               NewGenericResourceHandler[*corev1.Service, *corev1.ServiceList]("services", false, true),
		"endpoints":              NewGenericResourceHandler[*corev1.Endpoints, *corev1.EndpointsList]("endpoints", false, false),
		"endpointslices":         NewGenericResourceHandler[*discoveryv1.EndpointSlice, *discoveryv1.EndpointSliceList]("endpointslices", false, false),
		"configmaps":             NewGenericResourceHandler[*corev1.ConfigMap, *corev1.ConfigMapList]("configmaps", false, true),
		"secrets":                NewGenericResourceHandler[*corev1.Secret, *corev1.SecretList]("secrets", false, true),
		"persistentvolumes":      NewGenericResourceHandler[*corev1.PersistentVolume, *corev1.PersistentVolumeList]("persistentvolumes", true, true),
		"persistentvolumeclaims": NewGenericResourceHandler[*corev1.PersistentVolumeClaim, *corev1.PersistentVolumeClaimList]("persistentvolumeclaims", false, true),
		"serviceaccounts":        NewGenericResourceHandler[*corev1.ServiceAccount, *corev1.ServiceAccountList]("serviceaccounts", false, false),
		"crds":                   NewGenericResourceHandler[*apiextensionsv1.CustomResourceDefinition, *apiextensionsv1.CustomResourceDefinitionList]("crds", true, false),
		"events":                 NewEventHandler(),
		"deployments":            NewDeploymentHandler(),
		"replicasets":            NewGenericResourceHandler[*appsv1.ReplicaSet, *appsv1.ReplicaSetList]("replicasets", false, false),
		"statefulsets":           NewGenericResourceHandler[*appsv1.StatefulSet, *appsv1.StatefulSetList]("statefulsets", false, false),
		"daemonsets":             NewGenericResourceHandler[*appsv1.DaemonSet, *appsv1.DaemonSetList]("daemonsets", false, true),
		"jobs":                   NewGenericResourceHandler[*batchv1.Job, *batchv1.JobList]("jobs", false, false),
		"cronjobs":               NewGenericResourceHandler[*batchv1.CronJob, *batchv1.CronJobList]("cronjobs", false, false),
		"ingresses":              NewGenericResourceHandler[*networkingv1.Ingress, *networkingv1.IngressList]("ingresses", false, false),
		"storageclasses":         NewGenericResourceHandler[*storagev1.StorageClass, *storagev1.StorageClassList]("storageclasses", true, false),
		"roles":                  NewGenericResourceHandler[*rbacv1.Role, *rbacv1.RoleList]("roles", false, false),
		"rolebindings":           NewGenericResourceHandler[*rbacv1.RoleBinding, *rbacv1.RoleBindingList]("rolebindings", false, false),
		"clusterroles":           NewGenericResourceHandler[*rbacv1.ClusterRole, *rbacv1.ClusterRoleList]("clusterroles", true, false),
		"clusterrolebindings":    NewGenericResourceHandler[*rbacv1.ClusterRoleBinding, *rbacv1.ClusterRoleBindingList]("clusterrolebindings", true, false),
		"podmetrics":             NewGenericResourceHandler[*metricsv1.PodMetrics, *metricsv1.PodMetricsList]("metrics.k8s.io", false, false),
		"nodemetrics":            NewGenericResourceHandler[*metricsv1.NodeMetrics, *metricsv1.NodeMetricsList]("metrics.k8s.io", false, false),
	}

	for name, handler := range handlers {
		g := group.Group("/" + name)
		handler.registerCustomRoutes(g)
		if handler.IsClusterScoped() {
			registerClusterScopeRoutes(g, handler)
		} else {
			registerNamespaceScopeRoutes(g, handler)
		}

		if handler.Searchable() {
			RegisterSearchFunc(name, handler.Search)
		}
	}

	crHandler := NewCRHandler()
	otherGroup := group.Group("/:crd")
	{
		otherGroup.GET("", crHandler.List)
		otherGroup.GET("/_all", crHandler.List)
		otherGroup.GET("/_all/:name", crHandler.Get)
		otherGroup.PUT("/_all/:name", crHandler.Update)
		otherGroup.DELETE("/_all/:name", crHandler.Delete)

		otherGroup.GET("/:namespace", crHandler.List)
		otherGroup.GET("/:namespace/:name", crHandler.Get)
		otherGroup.PUT("/:namespace/:name", crHandler.Update)
		otherGroup.DELETE("/:namespace/:name", crHandler.Delete)
	}
}

func registerClusterScopeRoutes(group *gin.RouterGroup, handler resourceHandler) {
	group.GET("", handler.List)
	group.GET("/_all", handler.List)
	group.GET("/_all/:name", handler.Get)
	group.POST("/_all", handler.Create)
	group.PUT("/_all/:name", handler.Update)
	group.DELETE("/_all/:name", handler.Delete)
}

func registerNamespaceScopeRoutes(group *gin.RouterGroup, handler resourceHandler) {
	group.GET("", handler.List)
	group.GET("/:namespace", handler.List)
	group.GET("/:namespace/:name", handler.Get)
	group.POST("/:namespace", handler.Create)
	group.PUT("/:namespace/:name", handler.Update)
	group.DELETE("/:namespace/:name", handler.Delete)
}

var SearchFuncs = map[string]func(c *gin.Context, query string, limit int64) ([]common.SearchResult, error){}

func RegisterSearchFunc(resourceType string, searchFunc func(c *gin.Context, query string, limit int64) ([]common.SearchResult, error)) {
	SearchFuncs[resourceType] = searchFunc
}

func GetResource(c *gin.Context, resource, namespace, name string) (interface{}, error) {
	handler, exists := handlers[resource]
	if !exists {
		return nil, fmt.Errorf("resource handler for %s not found", resource)
	}
	return handler.GetResource(c, namespace, name)
}

func GetHandler(resource string) (resourceHandler, error) {
	handler, exists := handlers[resource]
	if !exists {
		return nil, fmt.Errorf("handler for resource %s not found", resource)
	}
	return handler, nil
}
