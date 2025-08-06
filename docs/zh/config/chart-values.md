# Chart Values 配置

本文档解释了 Kite Helm chart 中 `values.yaml` 文件的可配置参数。

## 全局设置

| 参数               | 描述                                               | 默认值                |
| ------------------ | -------------------------------------------------- | --------------------- |
| `replicaCount`     | Kite deployment 的副本数。                         | `1`                   |
| `image.repository` | Kite 容器的镜像仓库。                              | `ghcr.io/zxh326/kite` |
| `image.pullPolicy` | 镜像拉取策略。                                     | `IfNotPresent`        |
| `image.tag`        | 镜像标签。如果设置，将覆盖 chart 的 `appVersion`。 | `""`                  |
| `imagePullSecrets` | 用于从私有仓库拉取镜像的 secret。                  | `[]`                  |
| `nameOverride`     | 覆盖 chart 名称。                                  | `""`                  |
| `fullnameOverride` | 覆盖完整的 chart 名称。                            | `""`                  |

## 多集群配置

| 参数                                     | 描述                                                                 | 默认值       |
| ---------------------------------------- | -------------------------------------------------------------------- | ------------ |
| `multiCluster.enabled`                   | 通过挂载 kubeconfig 启用多集群模式。                                 | `false`      |
| `multiCluster.kubeconfig.fromContent`    | 从 kubeconfig 内容创建 secret。如果为 `true`，则必须提供 `content`。 | `false`      |
| `multiCluster.kubeconfig.content`        | kubeconfig 文件的纯文本内容。当 `fromContent` 为 `true` 时使用。     | `""`         |
| `multiCluster.kubeconfig.existingSecret` | 使用包含 kubeconfig 的现有 secret。如果指定，则忽略 `fromContent`。  | `""`         |
| `multiCluster.kubeconfig.secretKey`      | secret 中包含 kubeconfig 的键。当 `existingSecret` 被指定时使用。    | `kubeconfig` |
| `multiCluster.prometheus`                | 每个集群的 Prometheus 配置。键是集群名称，值是 Prometheus URL。      | `{}`         |
| `multiCluster.defaultPrometheusUrl`      | 没有特定配置的集群的默认 Prometheus URL。                            | `""`         |

## 角色配置

| 参数                     | 描述                                                         | 默认值                                             |
| ------------------------ | ------------------------------------------------------------ | -------------------------------------------------- |
| `roleConfig.roles`       | 定义具有特定权限（集群、资源、命名空间、操作）的自定义角色。 | 参见 `values.yaml` 中的 `admin` 和 `viewer` 角色。 |
| `roleConfig.roleMapping` | 将用户或 OIDC 组映射到已定义的角色。                         | `[]`                                               |

## 认证和授权

| 参数                 | 描述                                               | 默认值                                      |
| -------------------- | -------------------------------------------------- | ------------------------------------------- |
| `jwtSecret`          | 用于签署 JWT 令牌的密钥。                          | `"your_jwt_secret_key_here"`                |
| `basicAuth.enabled`  | 启用基本认证。                                     | `true`                                      |
| `basicAuth.username` | 基本认证的用户名。                                 | `"kite"`                                    |
| `basicAuth.password` | 基本认证的密码。                                   | `"password"`                                |
| `oauth.enabled`      | 启用 OAuth 认证。                                  | `false`                                     |
| `oauth.allowUsers`   | 允许的用户列表，以逗号分隔。`*` 表示允许所有用户。 | `"*"`                                       |
| `oauth.redirect`     | OAuth 回调的重定向 URL。                           | `"http://localhost:8080/api/auth/callback"` |
| `oauth.providers`    | OAuth 提供程序的配置。                             | `{}`                                        |

## 其他配置

| 参数               | 描述                         | 默认值       |
| ------------------ | ---------------------------- | ------------ |
| `extraEnvs`        | 要添加到容器的额外环境变量。 | `[]`         |
| `webhook.enabled`  | 启用 webhook 处理器。        | `false`      |
| `webhook.username` | webhook 认证的用户名。       | `"kite"`     |
| `webhook.password` | webhook 认证的密码。         | `"password"` |

## 服务账号

| 参数                         | 描述                                                                        | 默认值 |
| ---------------------------- | --------------------------------------------------------------------------- | ------ |
| `serviceAccount.create`      | 指定是否应创建服务账号。                                                    | `true` |
| `serviceAccount.automount`   | 自动挂载服务账号的 API 凭据。                                               | `true` |
| `serviceAccount.annotations` | 要添加到服务账号的注解。                                                    | `{}`   |
| `serviceAccount.name`        | 要使用的服务账号的名称。如果未设置且 `create` 为 `true`，则会生成一个名称。 | `""`   |

## RBAC

| 参数          | 描述                       | 默认值             |
| ------------- | -------------------------- | ------------------ |
| `rbac.create` | 指定是否应创建 RBAC 资源。 | `true`             |
| `rbac.rules`  | RBAC 规则列表。            | 参考 `values.yaml` |

## Pod 配置

| 参数                 | 描述                  | 默认值 |
| -------------------- | --------------------- | ------ |
| `podAnnotations`     | 要添加到 pod 的注解。 | `{}`   |
| `podLabels`          | 要添加到 pod 的标签。 | `{}`   |
| `podSecurityContext` | pod 的安全上下文。    | `{}`   |
| `securityContext`    | 容器的安全上下文。    | `{}`   |

## Service

| 参数           | 描述                    | 默认值      |
| -------------- | ----------------------- | ----------- |
| `service.type` | 要创建的 service 类型。 | `ClusterIP` |
| `service.port` | service 将公开的端口。  | `8080`      |

## Ingress

| 参数                  | 描述                  | 默认值             |
| --------------------- | --------------------- | ------------------ |
| `ingress.enabled`     | 启用 ingress 资源。   | `false`            |
| `ingress.className`   | ingress 的类名。      | `"nginx"`          |
| `ingress.annotations` | ingress 的注解。      | `{}`               |
| `ingress.hosts`       | ingress 的主机配置。  | 参考 `values.yaml` |
| `ingress.tls`         | ingress 的 TLS 配置。 | `[]`               |

## 资源管理

| 参数           | 描述                        | 默认值 |
| -------------- | --------------------------- | ------ |
| `resources`    | CPU/内存资源请求和限制。    | `{}`   |
| `nodeSelector` | 用于 pod 分配的节点选择器。 | `{}`   |
| `tolerations`  | 用于 pod 分配的容忍度。     | `[]`   |
| `affinity`     | 用于 pod 分配的亲和性。     | `{}`   |

## 探针

| 参数             | 描述             | 默认值             |
| ---------------- | ---------------- | ------------------ |
| `livenessProbe`  | 存活探针的配置。 | 参考 `values.yaml` |
| `readinessProbe` | 就绪探针的配置。 | 参考 `values.yaml` |

## 卷

| 参数           | 描述                           | 默认值 |
| -------------- | ------------------------------ | ------ |
| `volumes`      | 要添加到 deployment 的额外卷。 | `[]`   |
| `volumeMounts` | 要添加到容器的额外卷挂载。     | `[]`   |
