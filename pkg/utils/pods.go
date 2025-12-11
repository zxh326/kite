package utils

import (
	"fmt"

	"github.com/zxh326/kite/pkg/common"
	corev1 "k8s.io/api/core/v1"
)

func GetPodErrorMessage(pod *corev1.Pod) string {
	if pod == nil {
		return "Pod is nil"
	}
	for _, condition := range pod.Status.ContainerStatuses {
		if condition.State.Waiting != nil {
			return condition.State.Waiting.Message
		}
		if condition.State.Terminated != nil {
			return condition.State.Terminated.Message
		}
	}
	return ""
}

func IsPodReady(pod *corev1.Pod) bool {
	if pod == nil {
		return false
	}
	if pod.Status.Phase != corev1.PodRunning {
		return false
	}
	for _, condition := range pod.Status.Conditions {
		if condition.Type == corev1.PodReady && condition.Status == corev1.ConditionTrue {
			return true
		}
	}
	return false
}

func IsPodErrorOrSuccess(pod *corev1.Pod) bool {
	if pod == nil {
		return false
	}
	if pod.Status.Phase == corev1.PodFailed || pod.Status.Phase == corev1.PodSucceeded {
		return true
	}
	return false
}

func GenerateNodeAgentName(nodeName string) string {
	truncateNodeName := nodeName
	if len(nodeName)+len(common.NodeTerminalPodName)+7 > 63 {
		maxLength := 63 - len(common.NodeTerminalPodName) - 7
		truncateNodeName = nodeName[:maxLength]
	}
	return fmt.Sprintf("%s-%s-%s", common.NodeTerminalPodName, truncateNodeName, RandomString(5))
}
