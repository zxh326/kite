package utils

import "strings"

func GuessSearchResources(query string) (string, string) {
	guessSearchResources := "all"
	query = strings.TrimSpace(query)
	q := strings.Split(query, " ")
	if len(q) < 2 {
		return guessSearchResources, query
	}
	if len(strings.Split(query, " ")) >= 2 {
		switch strings.ToLower(strings.Split(query, " ")[0]) {
		case "po", "pod", "pods":
			guessSearchResources = "pods"
		case "svc", "service", "services":
			guessSearchResources = "services"
		case "pv", "persistentvolume", "persistentvolumes":
			guessSearchResources = "persistentvolumes"
		case "pvc", "persistentvolumeclaim", "persistentvolumeclaims":
			guessSearchResources = "persistentvolumeclaims"
		case "cm", "configmap", "configmaps":
			guessSearchResources = "configmaps"
		case "secret", "secrets":
			guessSearchResources = "secrets"
		case "dep", "deploy", "deployment", "deployments":
			guessSearchResources = "deployments"
		case "ds", "daemonset", "daemonsets":
			guessSearchResources = "daemonsets"
		case "statefulset", "statefulsets":
			guessSearchResources = "statefulsets"
		case "job", "jobs":
			guessSearchResources = "jobs"
		case "cronjob", "cronjobs":
			guessSearchResources = "cronjobs"
		default:
			return "all", query
		}
	}
	return guessSearchResources, strings.Join(q[1:], " ")
}
