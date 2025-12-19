package cluster

import (
	"context"
	"fmt"
	"time"

	"github.com/zxh326/kite/pkg/kube"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var discoveryLabels = []client.MatchingLabels{
	{
		"app.kubernetes.io/instance": "prometheus",
	},
	{
		"app.kubernetes.io/name": "prometheus",
	},
	{
		"app.kubernetes.io/instance": "vm",
	},
	{
		"app.kubernetes.io/part-of": "kube-prometheus-stack",
	},
	{
		"app.kubernetes.io/name": "vmsingle",
	},
}

func discoveryPrometheusURL(kc *kube.K8sClient) string {
	ctx, cancel := context.WithTimeout(context.TODO(), 5*time.Second)
	defer cancel()
	for _, matchLabels := range discoveryLabels {
		var svcList corev1.ServiceList
		err := kc.List(ctx, &svcList, matchLabels)
		if err != nil {
			continue
		}
		for _, svc := range svcList.Items {
			if svc.Spec.Type == corev1.ServiceTypeClusterIP || svc.Spec.Type == corev1.ServiceTypeLoadBalancer {
				for _, port := range svc.Spec.Ports {
					return fmt.Sprintf("http://%s.%s.svc.cluster.local:%d", svc.Name, svc.Namespace, port.Port)
				}
			}
		}
	}
	return ""
}
