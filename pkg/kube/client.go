package kube

import (
	"context"
	"fmt"
	"os"

	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	toolscache "k8s.io/client-go/tools/cache"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/cache"

	metricsv1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrllog "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

var runtimeScheme = runtime.NewScheme()

func init() {
	ctrllog.SetLogger(klog.NewKlogr())
	_ = scheme.AddToScheme(runtimeScheme)
	_ = apiextensionsv1.AddToScheme(runtimeScheme)
	_ = metricsv1.AddToScheme(runtimeScheme)
}

// K8sClient holds the Kubernetes client instances
type K8sClient struct {
	client.Client
	ClientSet     *kubernetes.Clientset
	Configuration *rest.Config
	MetricsClient *metricsclient.Clientset
}

// NewClient creates a K8sClient from a rest.Config
func NewClient(config *rest.Config) (*K8sClient, error) {
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	metricsClient, err := metricsclient.NewForConfig(config)
	if err != nil {
		klog.Warningf("failed to create metrics client: %v", err)
	}

	var c client.Client
	if os.Getenv("DISABLE_CACHE") == "true" {
		c, err = client.New(config, client.Options{
			Scheme: runtimeScheme,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create client: %w", err)
		}
	} else {
		mgr, err := manager.New(config, manager.Options{
			Scheme:         runtimeScheme,
			LeaderElection: false,
			Metrics: metricsserver.Options{
				BindAddress: "0", // Disable metrics server
			},
			Cache: cache.Options{
				DefaultWatchErrorHandler: func(ctx context.Context, r *toolscache.Reflector, err error) {
				},
			},
		})
		if err != nil {
			return nil, err
		}

		// Add field indexer for Pod spec.nodeName to enable efficient querying by node
		if err := mgr.GetFieldIndexer().IndexField(context.Background(), &corev1.Pod{}, "spec.nodeName", func(rawObj client.Object) []string {
			pod := rawObj.(*corev1.Pod)
			if pod.Spec.NodeName == "" {
				return nil
			}
			return []string{pod.Spec.NodeName}
		}); err != nil {
			return nil, fmt.Errorf("failed to create field indexer for spec.nodeName: %w", err)
		}

		go func() {
			if err := mgr.Start(context.Background()); err != nil {
				fmt.Printf("Error starting manager: %v\n", err)
			}
		}()
		if !mgr.GetCache().WaitForCacheSync(context.Background()) {
			return nil, fmt.Errorf("failed to wait for cache sync")
		}
		c = mgr.GetClient()
	}

	return &K8sClient{
		Client:        c,
		ClientSet:     clientset,
		Configuration: config,
		MetricsClient: metricsClient,
	}, nil
}
