package utils

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
)

func IsDeploymentReady(d *appsv1.Deployment) bool {
	desired := int32(1)
	if d.Spec.Replicas != nil {
		desired = *d.Spec.Replicas
	}

	progressing := false
	availableCond := false
	for _, cond := range d.Status.Conditions {
		if cond.Type == appsv1.DeploymentProgressing && cond.Status == corev1.ConditionTrue {
			progressing = true
		}
		if cond.Type == appsv1.DeploymentAvailable && cond.Status == corev1.ConditionTrue {
			availableCond = true
		}
	}

	ready := (d.Status.ReadyReplicas == desired) &&
		(d.Status.AvailableReplicas == desired) &&
		(d.Status.UpdatedReplicas == desired) &&
		progressing &&
		availableCond &&
		(d.Status.ObservedGeneration >= d.Generation)

	return ready
}
