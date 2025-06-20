package kube

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	corev1 "k8s.io/api/core/v1"
	apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	toolscache "k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/cache"

	metricsv1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
	metricsclient "k8s.io/metrics/pkg/client/clientset/versioned"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrllog "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

// K8sClient holds the Kubernetes client instances
type K8sClient struct {
	Client        client.Client
	ClientSet     *kubernetes.Clientset
	Configuration *rest.Config
	MetricsClient *metricsclient.Clientset
}

func init() {
	ctrllog.SetLogger(klog.NewKlogr())
}

// NewK8sClient initializes and returns a K8sClient
func NewK8sClient() (*K8sClient, error) {
	var config *rest.Config
	var err error

	// Try to use in-cluster config first (when running in a pod)
	config, err = rest.InClusterConfig()
	if err != nil {
		// Fall back to kubeconfig file
		kubeconfig := ""
		if home := homedir.HomeDir(); home != "" {
			kubeconfig = filepath.Join(home, ".kube", "config")
		}

		if envKubeconfig := os.Getenv("KUBECONFIG"); envKubeconfig != "" {
			kubeconfig = envKubeconfig
		}

		if kubeconfig == "" {
			return nil, fmt.Errorf("could not find kubeconfig file")
		}

		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, err
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	metricsClient, err := metricsclient.NewForConfig(config)
	if err != nil {
		klog.Warningf("failed to create metrics client: %v", err)
	}

	runtimeScheme := runtime.NewScheme()
	_ = scheme.AddToScheme(runtimeScheme)
	_ = apiextensionsv1.AddToScheme(runtimeScheme)
	_ = metricsv1.AddToScheme(runtimeScheme)

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
		klog.Info("Cache sync completed successfully")
		c = mgr.GetClient()
	}

	return &K8sClient{
		Client:        c,
		ClientSet:     clientset,
		Configuration: config,
		MetricsClient: metricsClient,
	}, nil
}
