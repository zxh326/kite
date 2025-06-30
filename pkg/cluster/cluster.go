package cluster

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/kube"
	"github.com/zxh326/kite/pkg/prometheus"
	"github.com/zxh326/kite/pkg/utils"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/homedir"
	"k8s.io/klog/v2"
)

type ClientSet struct {
	Name       string
	Version    string // Kubernetes version
	K8sClient  *kube.K8sClient
	PromClient *prometheus.Client
}

type ClusterManager struct {
	clusters       map[string]*ClientSet
	defaultContext string
}

func createCmInCluster() (*ClusterManager, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		return nil, err
	}

	k8sClient, err := kube.NewClient(config)
	if err != nil {
		return nil, err
	}
	promClient, err := prometheus.NewClient(getPrometheusURL("default"))
	if err != nil {
		klog.Warningf("Failed to create Prometheus client, some features may not work as expected, err: %v", err)
	}
	klog.Infof("Loaded in-cluster K8s client")
	return &ClusterManager{
		clusters: map[string]*ClientSet{
			"default": {
				Name:       "in-cluster",
				K8sClient:  k8sClient,
				PromClient: promClient,
			},
		},
		defaultContext: "default",
	}, nil
}

func createCmFromKubeconfig(kubeconfig string) (*ClusterManager, error) {
	config, err := clientcmd.LoadFromFile(kubeconfig)
	if err != nil {
		return nil, fmt.Errorf("failed to load kubeconfig: %w", err)
	}

	clusters := make(map[string]*ClientSet)
	wg := sync.WaitGroup{}
	wg.Add(len(config.Contexts))
	mux := &sync.Mutex{}
	for contextName := range config.Contexts {
		go func(contextName string) {
			defer wg.Done()
			restConfig, err := clientcmd.NewDefaultClientConfig(*config, &clientcmd.ConfigOverrides{
				CurrentContext: contextName,
			}).ClientConfig()
			if err != nil {
				klog.Warningf("Failed to create config for context %s: %v", contextName, err)
				return
			}
			k8sClient, err := kube.NewClient(restConfig)
			if err != nil {
				klog.Warningf("Failed to create k8s client for context %s: %v", contextName, err)
				return
			}
			promClient, err := prometheus.NewClient(getPrometheusURL(contextName))
			if err != nil {
				klog.Warningf("Failed to create Prometheus client for cluster %s, some features may not work as expected, err: %v", contextName, err)
			}
			klog.Infof("Loaded K8s client for context: %s", contextName)
			version := ""
			v, err := k8sClient.ClientSet.Discovery().ServerVersion()
			if err != nil {
				klog.Warningf("Failed to get server version for context %s: %v", contextName, err)
			} else {
				version = v.String()
			}
			mux.Lock()
			defer mux.Unlock()
			clusters[contextName] = &ClientSet{
				Name:       contextName,
				Version:    version,
				K8sClient:  k8sClient,
				PromClient: promClient,
			}
		}(contextName)
	}
	wg.Wait()
	if len(clusters) == 0 {
		return nil, fmt.Errorf("no clusters found in kubeconfig: %s", kubeconfig)
	}
	klog.Infof("Loaded %d clusters from kubeconfig: %s, default cluster: %s", len(clusters), kubeconfig, config.CurrentContext)
	return &ClusterManager{clusters: clusters, defaultContext: config.CurrentContext}, nil
}

func NewClusterManager() (*ClusterManager, error) {
	kubeconfig := ""
	if home := homedir.HomeDir(); home != "" {
		kubeconfig = filepath.Join(home, ".kube", "config")
	}

	if envKubeconfig := os.Getenv("KUBECONFIG"); envKubeconfig != "" {
		kubeconfig = envKubeconfig
	}

	_, err := os.Stat(kubeconfig)
	if err == nil {
		return createCmFromKubeconfig(kubeconfig)
	}
	return createCmInCluster()
}

func (cm *ClusterManager) GetClientSet(clusterName string) (*ClientSet, error) {
	if clusterName == "" {
		return cm.GetClientSet(cm.defaultContext)
	}
	if cluster, ok := cm.clusters[clusterName]; ok {
		return cluster, nil
	}
	return nil, fmt.Errorf("cluster not found: %s", clusterName)
}

func (cm *ClusterManager) GetClusters(c *gin.Context) {
	result := make([]common.ClusterInfo, 0, len(cm.clusters))
	for name, cluster := range cm.clusters {
		result = append(result, common.ClusterInfo{
			Name:      name,
			Version:   cluster.Version,
			IsDefault: name == cm.defaultContext,
		})
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})
	c.JSON(200, result)
}

func getPrometheusURL(clusterName string) string {
	envKey := utils.ToEnvName(clusterName) + "_PROMETHEUS_URL"
	if url := os.Getenv(envKey); url != "" {
		return url
	}

	if url := os.Getenv("PROMETHEUS_URL"); url != "" {
		klog.Infof("Using default Prometheus URL for cluster %s: %s", clusterName, url)
		return url
	}
	return ""
}
