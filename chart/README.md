# kite

![Version: 0.1.0](https://img.shields.io/badge/Version-0.1.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: latest](https://img.shields.io/badge/AppVersion-latest-informational?style=flat-square)

A Helm chart for Kubernetes Dashboard - Kite

## Installation

### Add Helm Repository

```bash
helm repo add kite https://zxh326.github.io/kite
helm repo update
```

### Install Chart

```bash
# Install in kube-system namespace (recommended)
helm install kite kite/kite -n kube-system

# Or install in custom namespace
helm install kite kite/kite -n my-namespace --create-namespace
```

### Upgrade Chart

```bash
helm upgrade kite kite/kite -n kube-system
```

### Uninstall Chart

```bash
helm uninstall kite -n kube-system
```

## Multi-Cluster Support

Kite supports managing multiple Kubernetes clusters through kubeconfig files. You can enable multi-cluster mode by setting `multiCluster.enabled: true` and providing kubeconfig configuration.

### Configuration Options

1. **Using kubeconfig content directly:**

or using helm `set-file` flag set `multiCluster.kubeconfig.content` to the path of your kubeconfig file:

```bash
helm install kite zxh326/kite --set multiCluster. --set-file multiCluster.kubeconfig.content=/path/to/kubeconfig
```

```yaml
multiCluster:
  enabled: true
  kubeconfig:
    fromContent: true
    content: |
      apiVersion: v1
      kind: Config
      # ... your kubeconfig content
```

1. **Using existing Secret:**

```yaml
multiCluster:
  enabled: true
  kubeconfig:
    existingSecret: "my-kubeconfig-secret"
    secretKey: "config"
```

### Prometheus Configuration for Multi-Cluster

You can configure different Prometheus URLs for each cluster:

```yaml
multiCluster:
  enabled: true
  defaultPrometheusUrl: "http://prometheus.default.svc.cluster.local:9090"
  prometheus:
    production: "https://prometheus.prod.example.com"
    staging: "https://prometheus.staging.example.com"
    cluster-dev: "http://prometheus.dev.svc.cluster.local:9090"
```

## Values

| Key                                         | Type   | Default                                     | Description                                            |
| ------------------------------------------- | ------ | ------------------------------------------- | ------------------------------------------------------ |
| affinity                                    | object | `{}`                                        |                                                        |
| basicAuth.enabled                           | bool   | `false`                                     |                                                        |
| basicAuth.password                          | string | `"password"`                                |                                                        |
| basicAuth.username                          | string | `"kite"`                                    |                                                        |
| extraEnvs                                   | list   | `[]`                                        | Additional environment variables                       |
| fullnameOverride                            | string | `""`                                        |                                                        |
| image.pullPolicy                            | string | `"IfNotPresent"`                            |                                                        |
| image.repository                            | string | `"ghcr.io/zxh326/kite"`                     |                                                        |
| image.tag                                   | string | `""`                                        |                                                        |
| imagePullSecrets                            | list   | `[]`                                        |                                                        |
| ingress.annotations                         | object | `{}`                                        |                                                        |
| ingress.className                           | string | `""`                                        |                                                        |
| ingress.enabled                             | bool   | `false`                                     |                                                        |
| ingress.hosts[0].host                       | string | `"chart-example.local"`                     |                                                        |
| ingress.hosts[0].paths[0].path              | string | `"/"`                                       |                                                        |
| ingress.hosts[0].paths[0].pathType          | string | `"ImplementationSpecific"`                  |                                                        |
| ingress.tls                                 | list   | `[]`                                        |                                                        |
| livenessProbe.httpGet.initialDelaySeconds   | int    | `10`                                        |                                                        |
| livenessProbe.httpGet.path                  | string | `"/healthz"`                                |                                                        |
| livenessProbe.httpGet.periodSeconds         | int    | `10`                                        |                                                        |
| livenessProbe.httpGet.port                  | string | `"http"`                                    |                                                        |
| multiCluster.enabled                        | bool   | `false`                                     | Enable multi-cluster mode                              |
| multiCluster.kubeconfig.fromContent         | bool   | `false`                                     | Create configmap from kubeconfig content               |
| multiCluster.kubeconfig.content             | string | `""`                                        | Kubeconfig file content (base64 encoded or plain text) |
| multiCluster.kubeconfig.existingConfigMap   | string | `""`                                        | Use existing configmap containing kubeconfig           |
| multiCluster.kubeconfig.configMapKey        | string | `"config"`                                  | Key name in the configmap                              |
| multiCluster.kubeconfig.existingSecret      | string | `""`                                        | Use existing secret containing kubeconfig              |
| multiCluster.kubeconfig.secretKey           | string | `"config"`                                  | Key name in the secret                                 |
| multiCluster.kubeconfig.mountPath           | string | `"/app/.kube/config"`                       | Mount path for kubeconfig file                         |
| multiCluster.prometheus                     | object | `{}`                                        | Prometheus configuration for each cluster              |
| multiCluster.defaultPrometheusUrl           | string | `""`                                        | Default Prometheus URL                                 |
| nameOverride                                | string | `""`                                        |                                                        |
| nodeSelector                                | object | `{}`                                        |                                                        |
| oauth.allowUsers                            | string | `"*"`                                       |                                                        |
| oauth.enabled                               | bool   | `false`                                     |                                                        |
| oauth.providers.<any_provider>.authUrl      | string | `"<auth_url>"`                              |                                                        |
| oauth.providers.<any_provider>.clientId     | string | `"<client_id>"`                             |                                                        |
| oauth.providers.<any_provider>.clientSecret | string | `"<client_secret>"`                         |                                                        |
| oauth.providers.<any_provider>.scopes       | string | `"<scopes>"`                                |                                                        |
| oauth.providers.<any_provider>.tokenUrl     | string | `"<token_url>"`                             |                                                        |
| oauth.providers.<any_provider>.userInfoUrl  | string | `"<user_info_url>"`                         |                                                        |
| oauth.redirect                              | string | `"http://localhost:8080/api/auth/callback"` |                                                        |
| podAnnotations                              | object | `{}`                                        |                                                        |
| podLabels                                   | object | `{}`                                        |                                                        |
| podSecurityContext                          | object | `{}`                                        |                                                        |
| rbac.create                                 | bool   | `true`                                      |                                                        |
| rbac.rules[0].apiGroups[0]                  | string | `"*"`                                       |                                                        |
| rbac.rules[0].resources[0]                  | string | `"*"`                                       |                                                        |
| rbac.rules[0].verbs[0]                      | string | `"*"`                                       |                                                        |
| rbac.rules[1].nonResourceURLs[0]            | string | `"*"`                                       |                                                        |
| rbac.rules[1].verbs[0]                      | string | `"*"`                                       |                                                        |
| readinessProbe.httpGet.initialDelaySeconds  | int    | `10`                                        |                                                        |
| readinessProbe.httpGet.path                 | string | `"/healthz"`                                |                                                        |
| readinessProbe.httpGet.periodSeconds        | int    | `10`                                        |                                                        |
| readinessProbe.httpGet.port                 | string | `"http"`                                    |                                                        |
| replicaCount                                | int    | `1`                                         |                                                        |
| resources                                   | object | `{}`                                        |                                                        |
| securityContext                             | object | `{}`                                        |                                                        |
| service.port                                | int    | `8080`                                      |                                                        |
| service.type                                | string | `"ClusterIP"`                               |                                                        |
| serviceAccount.annotations                  | object | `{}`                                        |                                                        |
| serviceAccount.automount                    | bool   | `true`                                      |                                                        |
| serviceAccount.create                       | bool   | `true`                                      |                                                        |
| serviceAccount.name                         | string | `""`                                        |                                                        |
| tolerations                                 | list   | `[]`                                        |                                                        |
| volumeMounts                                | list   | `[]`                                        |                                                        |
| volumes                                     | list   | `[]`                                        |                                                        |
