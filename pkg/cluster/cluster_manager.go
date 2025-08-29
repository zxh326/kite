package cluster

import (
	"errors"
	"fmt"
	"time"

	"github.com/zxh326/kite/pkg/kube"
	"github.com/zxh326/kite/pkg/model"
	"github.com/zxh326/kite/pkg/prometheus"
	"gorm.io/gorm"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/klog/v2"
)

type ClientSet struct {
	Name       string
	Version    string // Kubernetes version
	K8sClient  *kube.K8sClient
	PromClient *prometheus.Client

	config        string
	prometheusURL string
}

type ClusterManager struct {
	clusters       map[string]*ClientSet
	defaultContext string
}

func createClientSetInCluster(name, prometheusURL string) (*ClientSet, error) {
	cs := &ClientSet{
		Name:          name,
		prometheusURL: prometheusURL,
	}

	config, err := rest.InClusterConfig()
	if err != nil {
		return nil, err
	}
	cs.K8sClient, err = kube.NewClient(config)
	if err != nil {
		return nil, err
	}
	if prometheusURL != "" {
		cs.PromClient, err = prometheus.NewClient(prometheusURL)
		if err != nil {
			klog.Warningf("Failed to create Prometheus client, some features may not work as expected, err: %v", err)
		}
	}
	v, err := cs.K8sClient.ClientSet.Discovery().ServerVersion()
	if err != nil {
		klog.Warningf("Failed to get server version for cluster %s: %v", name, err)
	} else {
		cs.Version = v.String()
	}
	klog.Infof("Loaded in-cluster K8s client")
	return cs, nil
}

func createClientSetFromConfig(name, content, prometheusURL string) (*ClientSet, error) {
	cs := &ClientSet{
		Name:          name,
		config:        content,
		prometheusURL: prometheusURL,
	}
	restConfig, err := clientcmd.RESTConfigFromKubeConfig([]byte(content))
	if err != nil {
		klog.Warningf("Failed to create REST config for cluster %s: %v", name, err)
		return nil, err
	}

	cs.K8sClient, err = kube.NewClient(restConfig)
	if err != nil {
		klog.Warningf("Failed to create k8s client for cluster %s: %v", name, err)
		return nil, err
	}

	if prometheusURL != "" {
		cs.PromClient, err = prometheus.NewClient(prometheusURL)
		if err != nil {
			klog.Warningf("Failed to create Prometheus client for cluster %s, some features may not work as expected, err: %v", name, err)
		}
	}
	v, err := cs.K8sClient.ClientSet.Discovery().ServerVersion()
	if err != nil {
		klog.Warningf("Failed to get server version for cluster %s: %v", name, err)
	} else {
		cs.Version = v.String()
	}
	klog.Infof("Loaded K8s client for cluster: %s, version: %s", name, cs.Version)
	return cs, nil
}

func (cm *ClusterManager) GetClientSet(clusterName string) (*ClientSet, error) {
	if len(cm.clusters) == 0 {
		return nil, fmt.Errorf("no clusters available")
	}
	if clusterName == "" {
		if cm.defaultContext == "" {
			// If no default context is set, return the first available cluster
			for _, cs := range cm.clusters {
				return cs, nil
			}
		}
		return cm.GetClientSet(cm.defaultContext)
	}
	if cluster, ok := cm.clusters[clusterName]; ok {
		return cluster, nil
	}
	return nil, fmt.Errorf("cluster not found: %s", clusterName)
}

func ImportClustersFromKubeconfig(kubeconfig *clientcmdapi.Config) int64 {
	if len(kubeconfig.Contexts) == 0 {
		return 0
	}

	importedCount := 0
	for contextName, context := range kubeconfig.Contexts {
		config := clientcmdapi.NewConfig()
		config.Contexts = map[string]*clientcmdapi.Context{
			contextName: context,
		}
		config.CurrentContext = contextName
		config.Clusters = map[string]*clientcmdapi.Cluster{
			context.Cluster: kubeconfig.Clusters[context.Cluster],
		}
		config.AuthInfos = map[string]*clientcmdapi.AuthInfo{
			context.AuthInfo: kubeconfig.AuthInfos[context.AuthInfo],
		}
		configStr, err := clientcmd.Write(*config)
		if err != nil {
			continue
		}
		cluster := model.Cluster{
			Name:      contextName,
			Config:    model.SecretString(configStr),
			IsDefault: contextName == kubeconfig.CurrentContext,
		}
		if _, err := model.GetClusterByName(contextName); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				if err := model.AddCluster(&cluster); err != nil {
					continue
				}
				importedCount++
				klog.Infof("Imported cluster success: %s", contextName)
			}
			continue
		}
	}
	return int64(importedCount)
}

var (
	syncNow = make(chan struct{}, 1)
)

func syncClusters(cm *ClusterManager) error {
	clusters, err := model.ListClusters()
	if err != nil {
		klog.Warningf("list cluster err: %v", err)
		time.Sleep(5 * time.Second)
		return err
	}
	dbClusterMap := make(map[string]interface{})
	for _, cluster := range clusters {
		dbClusterMap[cluster.Name] = cluster
		if cluster.IsDefault {
			cm.defaultContext = cluster.Name
		}
		shouldUpdate := false
		current, currentExist := cm.clusters[cluster.Name]
		// enable -> disable
		// disable -> enable
		if (currentExist && !cluster.Enable) || (!currentExist && cluster.Enable) {
			klog.Infof("Cluster %s status changed, updating, enabled -> %v", cluster.Name, cluster.Enable)
			shouldUpdate = true
		}
		// kubeconfig change
		if currentExist && current.config != string(cluster.Config) {
			klog.Infof("Kubeconfig changed for cluster %s, updating", cluster.Name)
			shouldUpdate = true
		}
		// prometheus URL change
		if currentExist && current.prometheusURL != cluster.PrometheusURL {
			klog.Infof("Prometheus URL changed for cluster %s, updating", cluster.Name)
			shouldUpdate = true
		}

		if shouldUpdate {
			if currentExist {
				delete(cm.clusters, cluster.Name)
				current.K8sClient.Stop(cluster.Name)
			}
			if cluster.Enable {
				if cluster.InCluster {
					clientSet, err := createClientSetInCluster(cluster.Name, cluster.PrometheusURL)
					if err != nil {
						klog.Warningf("Failed to create in-cluster client set: %v", err)
						continue
					}
					cm.clusters[cluster.Name] = clientSet
				} else {
					clientSet, err := createClientSetFromConfig(cluster.Name, string(cluster.Config), cluster.PrometheusURL)
					if err != nil {
						klog.Warningf("Failed to create client set for cluster %s: %v", cluster.Name, err)
						continue
					}
					cm.clusters[cluster.Name] = clientSet
				}
			}
		}
	}
	for name, clientSet := range cm.clusters {
		if _, ok := dbClusterMap[name]; !ok {
			delete(cm.clusters, name)
			clientSet.K8sClient.Stop(name)
		}
	}

	return nil
}

func NewClusterManager() (*ClusterManager, error) {
	cm := new(ClusterManager)
	cm.clusters = make(map[string]*ClientSet)
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		syncNow <- struct{}{}
		for {
			select {
			case <-ticker.C:
				if err := syncClusters(cm); err != nil {
					klog.Warningf("Failed to sync clusters: %v", err)
				}
			case <-syncNow:
				if err := syncClusters(cm); err != nil {
					klog.Warningf("Failed to sync clusters: %v", err)
				}
			}
		}
	}()
	return cm, nil
}
