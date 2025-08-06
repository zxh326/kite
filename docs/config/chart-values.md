# Chart Values

This document explains the configurable parameters in the `values.yaml` file for the Kite Helm chart.

## Global Settings

| Parameter          | Description                                           | Default               |
| ------------------ | ----------------------------------------------------- | --------------------- |
| `replicaCount`     | Number of replicas for the Kite deployment.           | `1`                   |
| `image.repository` | Image repository for the Kite container.              | `ghcr.io/zxh326/kite` |
| `image.pullPolicy` | Image pull policy.                                    | `IfNotPresent`        |
| `image.tag`        | Image tag. Overrides the chart's `appVersion`.        | `""`                  |
| `imagePullSecrets` | Secrets for pulling images from a private repository. | `[]`                  |
| `nameOverride`     | Override the chart name.                              | `""`                  |
| `fullnameOverride` | Override the full chart name.                         | `""`                  |

## Multi-Cluster Configuration

| Parameter                                | Description                                                                                                  | Default      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| `multiCluster.enabled`                   | Enable multi-cluster mode by mounting a kubeconfig.                                                          | `false`      |
| `multiCluster.kubeconfig.fromContent`    | Create a secret from the kubeconfig content. If `true`, `content` must be provided.                          | `false`      |
| `multiCluster.kubeconfig.content`        | The kubeconfig file content in plain text. Used when `fromContent` is `true`.                                | `""`         |
| `multiCluster.kubeconfig.existingSecret` | Use an existing secret containing the kubeconfig. If specified, `fromContent` is ignored.                    | `""`         |
| `multiCluster.kubeconfig.secretKey`      | The key in the secret that contains the kubeconfig. Used when `existingSecret` is specified.                 | `kubeconfig` |
| `multiCluster.prometheus`                | Prometheus configuration for each cluster. The key is the cluster name, and the value is the Prometheus URL. | `{}`         |
| `multiCluster.defaultPrometheusUrl`      | Default Prometheus URL for clusters without a specific configuration.                                        | `""`         |

## Role Configuration

| Parameter                | Description                                                                              | Default                                           |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `roleConfig.roles`       | Defines custom roles with specific permissions (clusters, resources, namespaces, verbs). | See `values.yaml` for `admin` and `viewer` roles. |
| `roleConfig.roleMapping` | Maps users or OIDC groups to the defined roles.                                          | `[]`                                              |

## Authentication and Authorization

| Parameter            | Description                                                             | Default                                     |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| `jwtSecret`          | The secret key for signing JWT tokens.                                  | `"your_jwt_secret_key_here"`                |
| `basicAuth.enabled`  | Enable basic authentication.                                            | `true`                                      |
| `basicAuth.username` | Username for basic authentication.                                      | `"kite"`                                    |
| `basicAuth.password` | Password for basic authentication.                                      | `"password"`                                |
| `oauth.enabled`      | Enable OAuth authentication.                                            | `false`                                     |
| `oauth.allowUsers`   | Comma-separated list of allowed users. `*` means all users are allowed. | `"*"`                                       |
| `oauth.redirect`     | The redirect URL for OAuth callbacks.                                   | `"http://localhost:8080/api/auth/callback"` |
| `oauth.providers`    | Configuration for OAuth providers.                                      | `{}`                                        |

## Other Configurations

| Parameter          | Description                                               | Default      |
| ------------------ | --------------------------------------------------------- | ------------ |
| `extraEnvs`        | Extra environment variables to be added to the container. | `[]`         |
| `webhook.enabled`  | Enable the webhook handler.                               | `false`      |
| `webhook.username` | Username for webhook authentication.                      | `"kite"`     |
| `webhook.password` | Password for webhook authentication.                      | `"password"` |

## Service Account

| Parameter                    | Description                                                                                     | Default |
| ---------------------------- | ----------------------------------------------------------------------------------------------- | ------- |
| `serviceAccount.create`      | Specifies whether a service account should be created.                                          | `true`  |
| `serviceAccount.automount`   | Automatically mount a ServiceAccount's API credentials.                                         | `true`  |
| `serviceAccount.annotations` | Annotations to add to the service account.                                                      | `{}`    |
| `serviceAccount.name`        | The name of the service account to use. If not set and `create` is `true`, a name is generated. | `""`    |

## RBAC

| Parameter     | Description                                         | Default           |
| ------------- | --------------------------------------------------- | ----------------- |
| `rbac.create` | Specifies whether RBAC resources should be created. | `true`            |
| `rbac.rules`  | A list of RBAC rules.                               | See `values.yaml` |

## Pod Configuration

| Parameter            | Description                         | Default |
| -------------------- | ----------------------------------- | ------- |
| `podAnnotations`     | Annotations to add to the pod.      | `{}`    |
| `podLabels`          | Labels to add to the pod.           | `{}`    |
| `podSecurityContext` | Security context for the pod.       | `{}`    |
| `securityContext`    | Security context for the container. | `{}`    |

## Service

| Parameter      | Description                       | Default     |
| -------------- | --------------------------------- | ----------- |
| `service.type` | The type of service to create.    | `ClusterIP` |
| `service.port` | The port the service will expose. | `8080`      |

## Ingress

| Parameter             | Description                         | Default           |
| --------------------- | ----------------------------------- | ----------------- |
| `ingress.enabled`     | Enable ingress resource.            | `false`           |
| `ingress.className`   | The class of the ingress.           | `"nginx"`         |
| `ingress.annotations` | Annotations for the ingress.        | `{}`              |
| `ingress.hosts`       | Host configuration for the ingress. | See `values.yaml` |
| `ingress.tls`         | TLS configuration for the ingress.  | `[]`              |

## Resource Management

| Parameter      | Description                              | Default |
| -------------- | ---------------------------------------- | ------- |
| `resources`    | CPU/Memory resource requests and limits. | `{}`    |
| `nodeSelector` | Node selector for pod assignment.        | `{}`    |
| `tolerations`  | Tolerations for pod assignment.          | `[]`    |
| `affinity`     | Affinity for pod assignment.             | `{}`    |

## Probes

| Parameter        | Description                            | Default           |
| ---------------- | -------------------------------------- | ----------------- |
| `livenessProbe`  | Configuration for the liveness probe.  | See `values.yaml` |
| `readinessProbe` | Configuration for the readiness probe. | See `values.yaml` |

## Volumes

| Parameter      | Description                                       | Default |
| -------------- | ------------------------------------------------- | ------- |
| `volumes`      | Additional volumes to add to the deployment.      | `[]`    |
| `volumeMounts` | Additional volume mounts to add to the container. | `[]`    |
