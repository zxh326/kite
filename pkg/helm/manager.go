package helm

import (
	"fmt"
	"sort"
	"time"

	helmv3 "github.com/zxh326/kite/pkg/helm/types/v3"
	"helm.sh/helm/v3/pkg/action"
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/chart/loader"
	"helm.sh/helm/v3/pkg/cli"
	"helm.sh/helm/v3/pkg/release"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"
)

type Manager struct {
	kubeClient kubernetes.Interface
	settings   *cli.EnvSettings
}

func NewManager(kubeClient kubernetes.Interface) *Manager {
	return &Manager{
		kubeClient: kubeClient,
		settings:   cli.New(),
	}
}

func (m *Manager) getActionConfig(namespace string) (*action.Configuration, error) {
	actionConfig := new(action.Configuration)
	if err := actionConfig.Init(m.settings.RESTClientGetter(), namespace, "secret", klog.Infof); err != nil {
		return nil, fmt.Errorf("failed to initialize helm action config: %w", err)
	}
	return actionConfig, nil
}

func (m *Manager) toHelmRelease(rel *release.Release) *helmv3.HelmRelease {
	return &helmv3.HelmRelease{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.sh/v3",
			Kind:       "Release",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:              rel.Name,
			Namespace:         rel.Namespace,
			CreationTimestamp: metav1.Time{Time: rel.Info.FirstDeployed.Time},
			ResourceVersion:   fmt.Sprintf("%d", rel.Version),
		},
		Spec: helmv3.HelmReleaseSpec{
			Chart: &chart.Chart{
				Metadata: rel.Chart.Metadata,
			},
			Values:   rel.Config,
			Manifest: rel.Manifest,
		},
		Status: helmv3.HelmReleaseStatus{
			Info: *rel.Info,
		},
	}
}

func (m *Manager) ListReleases(namespace string) (*helmv3.HelmReleaseList, error) {
	if namespace == "_all" {
		namespace = ""
	}
	actionConfig, err := m.getActionConfig(namespace)
	if err != nil {
		return nil, err
	}
	client := action.NewList(actionConfig)
	if namespace == "" || namespace == "_all" {
		client.AllNamespaces = true
	}

	releases, err := client.Run()
	if err != nil {
		return nil, fmt.Errorf("failed to list helm releases: %w", err)
	}
	result := &helmv3.HelmReleaseList{
		ListMeta: metav1.ListMeta{
			ResourceVersion: fmt.Sprintf("%d", time.Now().Unix()),
		},
		Items: make([]helmv3.HelmRelease, len(releases)),
	}
	for i, rel := range releases {
		result.Items[i] = *m.toHelmRelease(rel)
	}
	sort.Slice(result.Items, func(i, j int) bool {
		return result.Items[i].CreationTimestamp.After(result.Items[j].CreationTimestamp.Time)
	})
	return result, nil
}

func (m *Manager) GetRelease(namespace, name string) (*helmv3.HelmRelease, error) {
	actionConfig, err := m.getActionConfig(namespace)
	if err != nil {
		return nil, err
	}
	client := action.NewGet(actionConfig)
	rel, err := client.Run(name)
	if err != nil {
		return nil, fmt.Errorf("failed to get release %s: %w", name, err)
	}
	return m.toHelmRelease(rel), nil
}

func (m *Manager) UpdateReleaseValues(namespace, name string, values map[string]interface{}) error {
	actionConfig, err := m.getActionConfig(namespace)
	if err != nil {
		return err
	}

	client := action.NewUpgrade(actionConfig)
	client.Wait = true
	client.Timeout = 5 * time.Minute

	rel, err := action.NewGet(actionConfig).Run(name)
	if err != nil {
		return fmt.Errorf("failed to get current release: %w", err)
	}

	_, err = client.Run(name, rel.Chart, values)
	if err != nil {
		return fmt.Errorf("failed to upgrade release: %w", err)
	}

	return nil
}

func (m *Manager) UninstallRelease(namespace, name string) error {
	actionConfig, err := m.getActionConfig(namespace)
	if err != nil {
		return err
	}

	client := action.NewUninstall(actionConfig)
	client.Wait = true
	client.Timeout = 5 * time.Minute

	_, err = client.Run(name)
	if err != nil {
		return fmt.Errorf("failed to uninstall release: %w", err)
	}
	return nil
}

func (m *Manager) InstallRelease(namespace, name string, values map[string]interface{}) error {
	actionConfig, err := m.getActionConfig(namespace)
	if err != nil {
		return err
	}

	client := action.NewInstall(actionConfig)
	client.ReleaseName = name
	client.Namespace = namespace
	client.Wait = true
	client.Timeout = 5 * time.Minute

	// For simplicity, we assume the chart is already loaded or available locally.
	// In a real implementation, you would load the chart from a repository or local path.
	chartPath := "" // Specify the path to the chart here.
	chart, err := client.LocateChart(chartPath, m.settings)
	if err != nil {
		return fmt.Errorf("failed to locate chart: %w", err)
	}

	ch, err := loader.Load(chart)
	if err != nil {
		return fmt.Errorf("failed to load chart: %w", err)
	}
	_, err = client.Run(ch, values)
	if err != nil {
		return fmt.Errorf("failed to install release: %w", err)
	}

	return nil
}

func (m *Manager) GetReleaseHistory(namespace, name string) (*helmv3.HelmReleaseList, error) {
	actionConfig, err := m.getActionConfig(namespace)
	if err != nil {
		return nil, err
	}

	client := action.NewHistory(actionConfig)
	client.Max = 10

	releases, err := client.Run(name)
	if err != nil {
		return nil, fmt.Errorf("failed to get release history: %w", err)
	}

	result := &helmv3.HelmReleaseList{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "helm.sh/v3",
			Kind:       "ReleaseList",
		},
		ListMeta: metav1.ListMeta{
			ResourceVersion: fmt.Sprintf("%d", time.Now().Unix()),
		},
		Items: make([]helmv3.HelmRelease, len(releases)),
	}
	for i, rel := range releases {
		result.Items[i] = *m.toHelmRelease(rel)
	}

	sort.Slice(result.Items, func(i, j int) bool {
		return result.Items[i].CreationTimestamp.After(result.Items[j].CreationTimestamp.Time)
	})

	return result, nil
}

func (m *Manager) RollbackRelease(namespace, name string, revision int) error {
	actionConfig, err := m.getActionConfig(namespace)
	if err != nil {
		return err
	}

	client := action.NewRollback(actionConfig)
	client.Version = revision
	client.Wait = true
	client.Timeout = 5 * time.Minute

	err = client.Run(name)
	if err != nil {
		return fmt.Errorf("failed to rollback release: %w", err)
	}

	return nil
}
