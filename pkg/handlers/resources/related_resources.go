package resources

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/kube"
	appsv1 "k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"sigs.k8s.io/controller-runtime/pkg/client"
	gatewayapiv1 "sigs.k8s.io/gateway-api/apis/v1"
)

func discoverServices(ctx context.Context, k8sClient *kube.K8sClient, namespace string, selector *metav1.LabelSelector) ([]common.RelatedResource, error) {
	if selector == nil || selector.MatchLabels == nil {
		return []common.RelatedResource{}, nil
	}

	var serviceList corev1.ServiceList
	if err := k8sClient.List(ctx, &serviceList, &client.ListOptions{Namespace: namespace}); err != nil {
		return nil, fmt.Errorf("failed to list services: %w", err)
	}

	var relatedServices []common.RelatedResource
	for _, service := range serviceList.Items {
		if service.Spec.Selector != nil {
			serviceSelector := labels.SelectorFromSet(service.Spec.Selector)
			if serviceSelector.Matches(labels.Set(selector.MatchLabels)) {
				relatedServices = append(relatedServices, common.RelatedResource{
					Type:      "services",
					Namespace: service.Namespace,
					Name:      service.Name,
				})
			}
		}
	}

	return relatedServices, nil
}

func discoverConfigs(namespace string, podSpec *corev1.PodTemplateSpec) []common.RelatedResource {
	if podSpec == nil {
		return []common.RelatedResource{}
	}

	configMapSet := make(map[string]struct{})
	secretSet := make(map[string]struct{})
	pvcSet := make(map[string]struct{})

	for _, container := range podSpec.Spec.Containers {
		for _, envVar := range container.Env {
			if envVar.ValueFrom != nil && envVar.ValueFrom.ConfigMapKeyRef != nil {
				configMapSet[envVar.ValueFrom.ConfigMapKeyRef.Name] = struct{}{}
			}
			if envVar.ValueFrom != nil && envVar.ValueFrom.SecretKeyRef != nil {
				secretSet[envVar.ValueFrom.SecretKeyRef.Name] = struct{}{}
			}
		}
		for _, envFrom := range container.EnvFrom {
			if envFrom.ConfigMapRef != nil {
				configMapSet[envFrom.ConfigMapRef.Name] = struct{}{}
			}
			if envFrom.SecretRef != nil {
				secretSet[envFrom.SecretRef.Name] = struct{}{}
			}
		}
	}

	for _, volume := range podSpec.Spec.Volumes {
		if volume.ConfigMap != nil {
			configMapSet[volume.ConfigMap.Name] = struct{}{}
		}
		if volume.Secret != nil {
			secretSet[volume.Secret.SecretName] = struct{}{}
		}
		if volume.PersistentVolumeClaim != nil {
			pvcSet[volume.PersistentVolumeClaim.ClaimName] = struct{}{}
		}
	}

	var related []common.RelatedResource
	for name := range configMapSet {
		related = append(related, common.RelatedResource{
			Type:      "configmaps",
			Name:      name,
			Namespace: namespace,
		})
	}
	for name := range secretSet {
		related = append(related, common.RelatedResource{
			Type:      "secrets",
			Name:      name,
			Namespace: namespace,
		})
	}
	for name := range pvcSet {
		related = append(related, common.RelatedResource{
			Type:      "persistentvolumeclaims",
			Name:      name,
			Namespace: namespace,
		})
	}

	return related
}

func checkInUsedConfigs(spec *corev1.PodTemplateSpec, name string, resourceType string) bool {
	if spec == nil {
		return false
	}

	containers := spec.Spec.Containers
	containers = append(containers, spec.Spec.InitContainers...)
	for _, container := range containers {
		for _, envVar := range container.Env {
			if envVar.ValueFrom != nil {
				if resourceType == "configmaps" && envVar.ValueFrom.ConfigMapKeyRef != nil && envVar.ValueFrom.ConfigMapKeyRef.Name == name {
					return true
				}
				if resourceType == "secrets" && envVar.ValueFrom.SecretKeyRef != nil && envVar.ValueFrom.SecretKeyRef.Name == name {
					return true
				}
			}
		}
		for _, envFrom := range container.EnvFrom {
			if resourceType == "configmaps" && envFrom.ConfigMapRef != nil && envFrom.ConfigMapRef.Name == name {
				return true
			}
			if resourceType == "secrets" && envFrom.SecretRef != nil && envFrom.SecretRef.Name == name {
				return true
			}
		}
	}
	for _, volume := range spec.Spec.Volumes {
		if resourceType == "configmaps" && volume.ConfigMap != nil && volume.ConfigMap.Name == name {
			return true
		}
		if resourceType == "secrets" && volume.Secret != nil && volume.Secret.SecretName == name {
			return true
		}
		if resourceType == "persistentvolumeclaims" && volume.PersistentVolumeClaim != nil && volume.PersistentVolumeClaim.ClaimName == name {
			return true
		}
	}
	return false
}

func discoveryWorkloads(ctx context.Context, k8sClient *kube.K8sClient, namespace string, name string, resourceType string) ([]common.RelatedResource, error) {
	var deploymentList appsv1.DeploymentList
	if err := k8sClient.List(ctx, &deploymentList, &client.ListOptions{Namespace: namespace}); err != nil {
		return nil, err
	}
	var statefulSetList appsv1.StatefulSetList
	if err := k8sClient.List(ctx, &statefulSetList, &client.ListOptions{Namespace: namespace}); err != nil {
		return nil, err
	}
	var daemonSetList appsv1.DaemonSetList
	if err := k8sClient.List(ctx, &daemonSetList, &client.ListOptions{Namespace: namespace}); err != nil {
		return nil, err
	}
	var related []common.RelatedResource
	for _, deployment := range deploymentList.Items {
		if checkInUsedConfigs(&deployment.Spec.Template, name, resourceType) {
			related = append(related, common.RelatedResource{
				Type:      "deployments",
				Name:      deployment.Name,
				Namespace: deployment.Namespace,
			})
		}
	}
	for _, statefulSet := range statefulSetList.Items {
		if checkInUsedConfigs(&statefulSet.Spec.Template, name, resourceType) {
			related = append(related, common.RelatedResource{
				Type:      "statefulsets",
				Name:      statefulSet.Name,
				Namespace: statefulSet.Namespace,
			})
		}
	}
	for _, daemonSet := range daemonSetList.Items {
		if checkInUsedConfigs(&daemonSet.Spec.Template, name, resourceType) {
			related = append(related, common.RelatedResource{
				Type:      "daemonsets",
				Name:      daemonSet.Name,
				Namespace: daemonSet.Namespace,
			})
		}
	}
	return related, nil
}

func discoverPodsByService(ctx context.Context, k8sClient *kube.K8sClient, service *corev1.Service) ([]common.RelatedResource, error) {
	var endpoints corev1.Endpoints
	if err := k8sClient.Get(ctx, client.ObjectKey{Namespace: service.Namespace, Name: service.Name}, &endpoints); err != nil {
		// Endpoints might not be found, which is not a critical error.
		// For example, for external name services.
		return nil, nil
	}

	var relatedPods []common.RelatedResource
	for _, subset := range endpoints.Subsets {
		for _, addr := range subset.Addresses {
			if addr.TargetRef != nil && addr.TargetRef.Kind == "Pod" {
				relatedPods = append(relatedPods, common.RelatedResource{
					Type:      "pod",
					Namespace: addr.TargetRef.Namespace,
					Name:      addr.TargetRef.Name,
				})
			}
		}
	}
	return relatedPods, nil
}

func GetRelatedResources(c *gin.Context) {
	cs := c.MustGet("cluster").(*cluster.ClientSet)
	namespace := c.Param("namespace")
	name := c.Param("name")
	resourceType := c.GetString("resource") // Get resource type from context

	resource, err := GetResource(c, resourceType, namespace, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get resource: " + err.Error()})
		return
	}
	ctx := c.Request.Context()
	var podSpec *corev1.PodTemplateSpec
	var selector *metav1.LabelSelector
	result := make([]common.RelatedResource, 0)

	switch res := resource.(type) {
	case *corev1.Pod:
		podSpec = &corev1.PodTemplateSpec{
			Spec: res.Spec,
		}
		// For pods, use the labels as selector
		if res.Labels != nil {
			selector = &metav1.LabelSelector{
				MatchLabels: res.Labels,
			}
		}
	case *appsv1.Deployment:
		podSpec = &res.Spec.Template
		selector = res.Spec.Selector
	case *appsv1.StatefulSet:
		podSpec = &res.Spec.Template
		selector = res.Spec.Selector
	case *appsv1.DaemonSet:
		podSpec = &res.Spec.Template
		selector = res.Spec.Selector
	case *corev1.Service:
		relatedPods, err := discoverPodsByService(ctx, cs.K8sClient, res)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to discover pods for service: " + err.Error()})
			return
		}
		result = append(result, relatedPods...)
	case *corev1.ConfigMap, *corev1.Secret, *corev1.PersistentVolumeClaim:
		if workloads, err := discoveryWorkloads(ctx, cs.K8sClient, namespace, name, resourceType); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to discover workloads: " + err.Error()})
			return
		} else {
			if resourceType == "persistentvolumeclaims" {
				result = append(result, common.RelatedResource{
					Type: "persistentvolumes",
					Name: res.(*corev1.PersistentVolumeClaim).Spec.VolumeName,
				})
			}
			result = append(result, workloads...)
		}
	case *gatewayapiv1.HTTPRoute:
		result = getHTTPRouteRelatedResouces(res, namespace)
	case *autoscalingv2.HorizontalPodAutoscaler:
		result = getAutoScalingRelatedResources(res, namespace)
	}

	if podSpec != nil && selector != nil {
		relatedServices, err := discoverServices(ctx, cs.K8sClient, namespace, selector)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to discover services: " + err.Error()})
			return
		}
		related := discoverConfigs(namespace, podSpec)

		result = append(result, relatedServices...)
		result = append(result, related...)
	}

	if v, ok := resource.(client.Object); ok {
		for _, owner := range v.GetOwnerReferences() {
			if owner.Kind == "ReplicaSet" {
				// get the owner of the ReplicaSet
				rs := &appsv1.ReplicaSet{}
				if err := cs.K8sClient.Get(ctx, client.ObjectKey{Namespace: v.GetNamespace(), Name: owner.Name}, rs); err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get ReplicaSet owner: " + err.Error()})
					return
				}
				if len(rs.OwnerReferences) > 0 {
					for _, rsOwner := range rs.OwnerReferences {
						result = append(result, common.RelatedResource{
							Type:      strings.ToLower(rsOwner.Kind) + "s",
							Name:      rsOwner.Name,
							Namespace: v.GetNamespace(),
						})
					}
				}
			}
			result = append(result, common.RelatedResource{
				Type:       strings.ToLower(owner.Kind) + "s",
				Name:       owner.Name,
				Namespace:  v.GetNamespace(),
				APIVersion: owner.APIVersion,
			})
		}
	}

	c.JSON(http.StatusOK, result)
}

func getHTTPRouteRelatedResouces(res *gatewayapiv1.HTTPRoute, namespace string) []common.RelatedResource {
	var result []common.RelatedResource
	for _, parentRef := range res.Spec.ParentRefs {
		var parentResourceType string
		if parentRef.Kind != nil && *parentRef.Kind != "" {
			parentResourceType = strings.ToLower(string(*parentRef.Kind)) + "s"
		} else {
			parentResourceType = "gateways"
		}
		result = append(result, common.RelatedResource{
			Type: parentResourceType,
			Name: string(parentRef.Name),
			Namespace: func() string {
				if parentRef.Namespace != nil && *parentRef.Namespace != "" {
					return string(*parentRef.Namespace)
				}
				return namespace
			}(),
			APIVersion: gatewayapiv1.GroupVersion.String(),
		})
	}

	for _, rule := range res.Spec.Rules {
		for _, backend := range rule.BackendRefs {
			var backendType, apiVersion string
			if backend.Kind != nil && *backend.Kind != "" {
				backendType = strings.ToLower(string(*backend.Kind)) + "s"
			} else {
				backendType = "services"
			}
			if backendType == "services" {
				apiVersion = corev1.SchemeGroupVersion.String()
			}
			result = append(result, common.RelatedResource{
				Type: backendType,
				Name: string(backend.Name),
				Namespace: func() string {
					if backend.Namespace != nil && *backend.Namespace != "" {
						return string(*backend.Namespace)
					}
					return namespace
				}(),
				APIVersion: apiVersion,
			})
		}
	}
	return result
}

func getAutoScalingRelatedResources(res *autoscalingv2.HorizontalPodAutoscaler, namespace string) []common.RelatedResource {
	var result []common.RelatedResource
	scaleTarget := res.Spec.ScaleTargetRef
	result = append(result, common.RelatedResource{
		Type:       strings.ToLower(scaleTarget.Kind) + "s",
		APIVersion: scaleTarget.APIVersion,
		Name:       scaleTarget.Name,
		Namespace:  namespace,
	})
	return result
}
