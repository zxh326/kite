package kube

import (
	"errors"
	"sync"

	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/informers"
	"k8s.io/client-go/kubernetes"
	appsv1 "k8s.io/client-go/listers/apps/v1"
	listerscorev1 "k8s.io/client-go/listers/core/v1"
	"k8s.io/client-go/tools/cache"
)

type Store interface {
	PodLister() listerscorev1.PodLister
	DeploymentLister() appsv1.DeploymentLister
	StatefulSetLister() appsv1.StatefulSetLister
	ServiceLister() listerscorev1.ServiceLister
	NodeLister() listerscorev1.NodeLister
}

type store struct {
	podLister         listerscorev1.PodLister
	deploymentLister  appsv1.DeploymentLister
	statefulSetLister appsv1.StatefulSetLister
	serviceLister     listerscorev1.ServiceLister
	nodeLister        listerscorev1.NodeLister
}

func (s *store) DeploymentLister() appsv1.DeploymentLister {
	return s.deploymentLister
}

func (s *store) StatefulSetLister() appsv1.StatefulSetLister {
	return s.statefulSetLister
}

func (s *store) PodLister() listerscorev1.PodLister {
	return s.podLister
}

func (s *store) ServiceLister() listerscorev1.ServiceLister {
	return s.serviceLister
}

func (s *store) NodeLister() listerscorev1.NodeLister {
	return s.nodeLister
}

func Load(clientset kubernetes.Interface) (Store, error) {
	informerFactory := informers.NewSharedInformerFactoryWithOptions(clientset, 0)

	pod := informerFactory.Core().V1().Pods()
	podInformer := pod.Informer()
	deployment := informerFactory.Apps().V1().Deployments()
	deploymentInformer := deployment.Informer()
	statefulSet := informerFactory.Apps().V1().StatefulSets()
	statefulSetInformer := statefulSet.Informer()
	service := informerFactory.Core().V1().Services()
	serviceInformer := service.Informer()
	node := informerFactory.Core().V1().Nodes()
	nodeInformer := node.Informer()

	informerFactory.Start(wait.NeverStop)

	sharedInformers := []cache.SharedInformer{
		podInformer,
		deploymentInformer,
		statefulSetInformer,
		serviceInformer,
		nodeInformer,
	}
	var wg sync.WaitGroup
	errCh := make(chan error, 1)
	wg.Add(len(sharedInformers))
	for _, si := range sharedInformers {
		go func(si cache.SharedInformer) {
			defer wg.Done()
			if !cache.WaitForCacheSync(wait.NeverStop, si.HasSynced) {
				select {
				case errCh <- errors.New("timed out waiting for caches to sync"):
				default:
				}
			}
		}(si)
	}
	wg.Wait()

	select {
	case err := <-errCh:
		return nil, err
	default:
	}

	podLister := pod.Lister()
	deploymentLister := deployment.Lister()
	statefulSetLister := statefulSet.Lister()
	serviceLister := service.Lister()
	nodeLister := node.Lister()

	return &store{
		podLister:         podLister,
		deploymentLister:  deploymentLister,
		statefulSetLister: statefulSetLister,
		serviceLister:     serviceLister,
		nodeLister:        nodeLister,
	}, nil
}
