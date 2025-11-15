# Chart Values

本文档描述了 Kite Helm Chart 的所有可用配置选项。

## 基础配置

| 参数               | 描述                                               | 默认值                |
| ------------------ | -------------------------------------------------- | --------------------- |
| `replicaCount`     | 副本数量                                           | `1`                   |
| `image.repository` | 容器镜像仓库                                       | `ghcr.io/zxh326/kite` |
| `image.pullPolicy` | 镜像拉取策略                                       | `IfNotPresent`        |
| `image.tag`        | 镜像标签。如果设置，将覆盖 chart 的 `appVersion`。 | `""`                  |
| `imagePullSecrets` | 私有镜像仓库的拉取密钥                             | `[]`                  |
| `nameOverride`     | 覆盖 chart 名称                                    | `""`                  |
| `fullnameOverride` | 覆盖完整名称                                       | `""`                  |
| `debug`            | 启用调试模式                                       | `false`               |
| `basePath`         | 应用的基础路径，详见安装文档中的说明。     | `""`                 |

## 认证与安全

| 参数                   | 描述                                                       | 默认值                                               |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `anonymousUserEnabled` | 启用匿名用户访问，拥有完全管理员权限。生产环境请谨慎使用。 | `false`                                              |
| `jwtSecret`            | 用于签名 JWT 令牌的密钥。生产环境请修改此值。              | `"kite-default-jwt-secret-key-change-in-production"` |
| `encryptKey`           | 用于加密敏感数据的密钥。生产环境请修改此值。               | `"kite-default-encryption-key-change-in-production"` |
| `host`                 | 应用程序的主机名                                           | `""`                                                 |

## 数据库配置

| 参数      | 描述                                                             | 默认值   |
| --------- | ---------------------------------------------------------------- | -------- |
| `db.type` | 数据库类型：`sqlite`、`postgres`、`mysql`                        | `sqlite` |
| `db.dsn`  | MySQL/Postgres 的完整 DSN 字符串。当类型为 mysql/postgres 时必需 | `""`     |

### SQLite 配置

| 参数                                      | 描述                                  | 默认值              |
| ----------------------------------------- | ------------------------------------- | ------------------- |
| `db.sqlite.persistence.pvc.enabled`       | 是否创建 PVC 来存储 sqlite 数据库文件 | `false`             |
| `db.sqlite.persistence.pvc.existingClaim` | 使用现有的 PVC                        | `""`                |
| `db.sqlite.persistence.pvc.storageClass`  | PVC 的 StorageClass（可选）           | `""`                |
| `db.sqlite.persistence.pvc.accessModes`   | PVC 的访问模式                        | `["ReadWriteOnce"]` |
| `db.sqlite.persistence.pvc.size`          | PVC 请求的存储大小                    | `1Gi`               |
| `db.sqlite.persistence.hostPath.enabled`  | 是否使用 hostPath 存储                | `false`             |
| `db.sqlite.persistence.hostPath.path`     | hostPath 路径                         | `/path/to/host/dir` |
| `db.sqlite.persistence.hostPath.type`     | hostPath 类型                         | `DirectoryOrCreate` |
| `db.sqlite.persistence.mountPath`         | 容器内的挂载路径                      | `/data`             |
| `db.sqlite.persistence.filename`          | 挂载路径内的 sqlite 文件名            | `kite.db`           |

## 环境变量

| 参数        | 描述               | 默认值 |
| ----------- | ------------------ | ------ |
| `extraEnvs` | 额外的环境变量列表 | `[]`   |

## 服务账户配置

| 参数                         | 描述                        | 默认值 |
| ---------------------------- | --------------------------- | ------ |
| `serviceAccount.create`      | 是否创建服务账户            | `true` |
| `serviceAccount.automount`   | 自动挂载服务账户的 API 凭据 | `true` |
| `serviceAccount.annotations` | 服务账户的注解              | `{}`   |
| `serviceAccount.name`        | 使用的服务账户名称          | `""`   |

## RBAC 配置

| 参数          | 描述               | 默认值     |
| ------------- | ------------------ | ---------- |
| `rbac.create` | 是否创建 RBAC 资源 | `true`     |
| `rbac.rules`  | RBAC 规则列表      | 见下方示例 |

### RBAC 规则示例

```yaml
rbac:
  rules:
    - apiGroups: ["*"]
      resources: ["*"]
      verbs: ["*"]
    - nonResourceURLs: ["*"]
      verbs: ["*"]
```

## Pod 配置

| 参数                 | 描述                   | 默认值 |
| -------------------- | ---------------------- | ------ |
| `podAnnotations`     | Pod 的 Kubernetes 注解 | `{}`   |
| `podLabels`          | Pod 的 Kubernetes 标签 | `{}`   |
| `podSecurityContext` | Pod 安全上下文         | `{}`   |
| `securityContext`    | 容器安全上下文         | `{}`   |

## 服务配置

| 参数           | 描述     | 默认值      |
| -------------- | -------- | ----------- |
| `service.type` | 服务类型 | `ClusterIP` |
| `service.port` | 服务端口 | `8080`      |

## Ingress 配置

| 参数                  | 描述             | 默认值     |
| --------------------- | ---------------- | ---------- |
| `ingress.enabled`     | 是否启用 Ingress | `false`    |
| `ingress.className`   | Ingress 类名     | `"nginx"`  |
| `ingress.annotations` | Ingress 注解     | `{}`       |
| `ingress.hosts`       | Ingress 主机配置 | 见下方示例 |
| `ingress.tls`         | TLS 配置         | `[]`       |

### Ingress 主机配置示例

```yaml
ingress:
  hosts:
    - host: kite.zzde.me
      paths:
        - path: /
          pathType: ImplementationSpecific
```

## 资源限制

| 参数        | 描述               | 默认值 |
| ----------- | ------------------ | ------ |
| `resources` | 容器资源限制和请求 | `{}`   |

### 资源限制示例

```yaml
resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

## 健康检查

| 参数             | 描述         | 默认值     |
| ---------------- | ------------ | ---------- |
| `livenessProbe`  | 存活探针配置 | 见下方示例 |
| `readinessProbe` | 就绪探针配置 | 见下方示例 |

### 健康检查示例

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: http
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet:
    path: /healthz
    port: http
  initialDelaySeconds: 10
  periodSeconds: 10
```

## 存储配置

| 参数           | 描述             | 默认值 |
| -------------- | ---------------- | ------ |
| `volumes`      | 额外的卷配置     | `[]`   |
| `volumeMounts` | 额外的卷挂载配置 | `[]`   |

## 调度配置

| 参数           | 描述       | 默认值 |
| -------------- | ---------- | ------ |
| `nodeSelector` | 节点选择器 | `{}`   |
| `tolerations`  | 容忍度配置 | `[]`   |
| `affinity`     | 亲和性配置 | `{}`   |
