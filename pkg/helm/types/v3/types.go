package v3

import (
	"helm.sh/helm/v3/pkg/chart"
	"helm.sh/helm/v3/pkg/release"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type HelmReleaseSpec struct {
	Chart    *chart.Chart           `json:"chart"`
	Values   map[string]interface{} `json:"values,omitempty"`
	Manifest string                 `json:"manifest"`
}

type HelmRelease struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata"`
	Spec              HelmReleaseSpec   `json:"spec"`
	Status            HelmReleaseStatus `json:"status"`
}

type HelmReleaseStatus struct {
	release.Info `json:",inline"`
}

type HelmReleaseList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata"`
	Items           []HelmRelease `json:"items"`
}
