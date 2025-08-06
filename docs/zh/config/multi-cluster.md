# 多集群配置

Kite 提供了从单一仪表盘管理多个 Kubernetes 集群的强大支持。本指南说明如何配置和使用多集群功能。

## 概述

利用 Kite 的多集群支持，您可以：

- 单击即可在多个集群之间切换
- 为每个集群配置独立的 Prometheus 实例
- 为每个集群应用不同的 RBAC 规则

## 配置方法

### 方法 1：使用 Kubeconfig 文件

配置多个集群的最简单方法是使用具有多个上下文的 kubeconfig 文件：

```yaml
# values.yaml（用于 Helm）
multiCluster:
  enabled: false

  kubeconfig:
    fromContent: true

    # The kubeconfig file content (plain text)
    # 或者使用 helm 的 `--set-file` 参数传递文件内容
    #   helm install kite . --set-file multiCluster.kubeconfig.content=/path/to/kubeconfig
    content: |-
      apiVersion: v1
      kind: Config
      current-context: dev-cluster
      contexts:
      - name: dev-cluster
        context:
          cluster: development
          user: admin
      - name: prod-cluster
        context:
          cluster: production
          user: admin
      # ... 其他上下文、集群和用户
```

或者将其挂载到容器内，并使用环境变量指定 kubeconfig 路径：

```bash
KUBECONFIG=/path/to/kubeconfig
```

### 方法 2：使用单独的 Secret Kubeconfig

对于生产环境中更安全的管理：

```yaml
multiCluster:
  enabled: true
  kubeconfig:
    fromContent: false
    existingSecret: "kite-kubeconfig" # 指向包含 kubeconfig 的 Secret 名称
    secretKey: "kubeconfig" # Secret 中的键名
```

## 集群特定的 Prometheus 配置

详见 [Prometheus 配置指南](./prometheus-setup)。

## 多集群的 RBAC 配置

您可以为每个集群定义特定的 RBAC 规则：

```yaml
# roles.yaml
roles:
  - name: prod-admin
    description: 生产集群的管理员
    clusters:
      - "prod-cluster"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "*"
  - name: dev-admin
    description: 开发集群的管理员
    clusters:
      - "dev-cluster"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "*"
  - name: view-all
    description: 所有集群的只读访问权限
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "get"
      - "list"

roleMapping:
  - name: prod-admin
    users:
      - alice@example.com
    oidcGroups:
      - prod-admins
  - name: dev-admin
    users:
      - bob@example.com
    oidcGroups:
      - dev-admins
  - name: view-all
    oidcGroups:
      - viewers
```
