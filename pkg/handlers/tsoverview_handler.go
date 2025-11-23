package handlers

import (
	"net/http"

	tykov1alpha1 "github.com/akyriako/typesense-operator/api/v1alpha1"
	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/model"
	"github.com/zxh326/kite/pkg/utils"
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/labels"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type TypesenseOverviewData struct {
	TotalNodes       int                   `json:"totalNodes"`
	ReadyNodes       int                   `json:"readyNodes"`
	TotalOperators   int                   `json:"totalOperators"`
	RunningOperators int                   `json:"runningOperators"`
	TotalClusters    int                   `json:"totalClusters"`
	RunningClusters  int                   `json:"runningClusters"`
	TotalScrapers    int                   `json:"totalScrapers"`
	RunningScrapers  int                   `json:"runningScrapers"`
	PromEnabled      bool                  `json:"prometheusEnabled"`
	Resource         common.ResourceMetric `json:"resource"`
}

func GetTypesenseOverview(c *gin.Context) {
	ctx := c.Request.Context()

	cs := c.MustGet("cluster").(*cluster.ClientSet)
	user := c.MustGet("user").(model.User)
	if len(user.Roles) == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
	}

	// Get nodes
	nodes := &corev1.NodeList{}
	if err := cs.K8sClient.List(ctx, nodes, &client.ListOptions{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	readyNodes := 0
	var cpuAllocatable, memAllocatable resource.Quantity
	var cpuRequested, memRequested resource.Quantity
	var cpuLimited, memLimited resource.Quantity
	for _, node := range nodes.Items {
		cpuAllocatable.Add(*node.Status.Allocatable.Cpu())
		memAllocatable.Add(*node.Status.Allocatable.Memory())
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady && condition.Status == corev1.ConditionTrue {
				readyNodes++
				break
			}
		}
	}

	// Get Operator Deployments
	deploymentsSelector, err := labels.Parse("app.kubernetes.io/name=typesense-operator")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	deployments := &appsv1.DeploymentList{}
	if err := cs.K8sClient.List(ctx, deployments, &client.ListOptions{LabelSelector: deploymentsSelector}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	runningOperators := 0
	for _, d := range deployments.Items {
		if utils.IsDeploymentReady(&d) {
			runningOperators++
		}
	}

	// Get Typesense Clusters
	tscs := &tykov1alpha1.TypesenseClusterList{}
	if err := cs.K8sClient.List(ctx, tscs, &client.ListOptions{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	runningClusters := 0
	runningScrapers := 0
	totalScrapers := 0
	for _, tsc := range tscs.Items {
		if tsc.Status.Phase == "QuorumReady" {
			runningClusters++
		}

		cronjobs := &batchv1.CronJobList{}
		if err := cs.K8sClient.List(ctx, cronjobs, &client.ListOptions{
			Namespace: tsc.Namespace,
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Filter by owner reference and count non-suspended ones
		for _, cronjob := range cronjobs.Items {
			for _, owner := range cronjob.GetOwnerReferences() {
				if owner.UID == tsc.UID {
					if cronjob.Spec.Suspend == nil || !*cronjob.Spec.Suspend {
						runningScrapers++
					}
					totalScrapers++
				}
			}
		}
	}

	// Get pods
	pods := &corev1.PodList{}
	if err := cs.K8sClient.List(ctx, pods, &client.ListOptions{}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	runningPods := 0
	for _, pod := range pods.Items {
		for _, container := range pod.Spec.Containers {
			cpuRequested.Add(*container.Resources.Requests.Cpu())
			memRequested.Add(*container.Resources.Requests.Memory())

			if container.Resources.Limits != nil {
				if cpuLimit := container.Resources.Limits.Cpu(); cpuLimit != nil {
					cpuLimited.Add(*cpuLimit)
				}
				if memLimit := container.Resources.Limits.Memory(); memLimit != nil {
					memLimited.Add(*memLimit)
				}
			}
		}
		if pod.Status.Phase == corev1.PodRunning || pod.Status.Phase == corev1.PodSucceeded {
			runningPods++
		}
	}

	overview := TypesenseOverviewData{
		TotalNodes:       len(nodes.Items),
		ReadyNodes:       readyNodes,
		TotalOperators:   len(deployments.Items),
		RunningOperators: runningOperators,
		TotalClusters:    len(tscs.Items),
		RunningClusters:  runningClusters,
		TotalScrapers:    totalScrapers,
		RunningScrapers:  runningScrapers,
		PromEnabled:      cs.PromClient != nil,
		Resource: common.ResourceMetric{
			CPU: common.Resource{
				Allocatable: cpuAllocatable.MilliValue(),
				Requested:   cpuRequested.MilliValue(),
				Limited:     cpuLimited.MilliValue(),
			},
			Mem: common.Resource{
				Allocatable: memAllocatable.MilliValue(),
				Requested:   memRequested.MilliValue(),
				Limited:     memLimited.MilliValue(),
			},
		},
	}

	c.JSON(http.StatusOK, overview)
}
