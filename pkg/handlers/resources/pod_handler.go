package resources

import (
	"sync"

	"github.com/gin-gonic/gin"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	metricsv1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
)

type PodHandler struct {
	*GenericResourceHandler[*corev1.Pod, *corev1.PodList]
}

func NewPodHandler() *PodHandler {
	return &PodHandler{
		GenericResourceHandler: NewGenericResourceHandler[*corev1.Pod, *corev1.PodList]("pods", false, true),
	}
}

type PodMetrics struct {
	CPUUsage    int64 `json:"cpuUsage,omitempty"`
	MemoryUsage int64 `json:"memoryUsage,omitempty"`
}

type PodWithMetrics struct {
	corev1.Pod `json:",inline"`
	Metrics    PodMetrics `json:"metrics"`
}

type PodListWithMetrics struct {
	Items           []PodWithMetrics `json:"items"`
	metav1.TypeMeta `json:",inline"`
	// Standard list metadata.
	// More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
	// +optional
	metav1.ListMeta `json:"metadata" protobuf:"bytes,1,opt,name=metadata"`
}

func GetPodMetrics(c *gin.Context, pod *corev1.Pod) (PodMetrics, error) {
	if v, err := GetResource(c, "podmetrics", pod.Namespace, pod.Name); err != nil {
		return PodMetrics{}, err
	} else {
		podMetrics := v.(*metricsv1.PodMetrics)
		if len(podMetrics.Containers) == 0 {
			return PodMetrics{}, nil
		}
		var cpuUsage, memUsage int64
		for _, container := range podMetrics.Containers {
			if cpuQuantity, ok := container.Usage["cpu"]; ok {
				cpuUsage += cpuQuantity.MilliValue()
			}
			if memQuantity, ok := container.Usage["memory"]; ok {
				memUsage += memQuantity.Value()
			}
		}
		return PodMetrics{
			CPUUsage:    cpuUsage,
			MemoryUsage: memUsage,
		}, nil
	}
}

func (h *PodHandler) List(c *gin.Context) {
	objlist, err := h.list(c)
	if err != nil {
		return
	}

	var wg sync.WaitGroup
	result := &PodListWithMetrics{
		TypeMeta: objlist.TypeMeta,
		ListMeta: objlist.ListMeta,
		Items:    []PodWithMetrics{},
	}
	result.Items = make([]PodWithMetrics, 0, len(objlist.Items))

	workers := 10
	workerChan := make(chan *corev1.Pod, workers)
	resultsChan := make(chan PodWithMetrics, len(objlist.Items))
	for range workers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for pod := range workerChan {
				podWithMetrics := PodWithMetrics{
					Pod: *pod,
				}
				if pod.Status.Phase != corev1.PodRunning {
					resultsChan <- podWithMetrics
					continue
				}
				metrics, err := GetPodMetrics(c, pod)
				if err == nil {
					podWithMetrics.Metrics = metrics
				}
				resultsChan <- podWithMetrics
			}
		}()
	}
	for i := range objlist.Items {
		workerChan <- &objlist.Items[i]
	}
	close(workerChan)
	go func() {
		wg.Wait()
		close(resultsChan)
	}()
	for rc := range resultsChan {
		result.Items = append(result.Items, rc)
	}
	c.JSON(200, result)
}
