# RBAC 配置指南

本指南说明如何在 Kite 中配置基于角色的访问控制 (RBAC)，以管理用户权限和访问权限。

## 概述

Kite 的 RBAC 系统允许您：

- 定义具有特定权限的自定义角色
- 将角色分配给用户或 OIDC 组
- 在集群、命名空间和资源级别控制访问
- 为每个角色指定允许的操作（动词）

## 配置文件结构

RBAC 配置在 `roles.yaml` 文件中定义，有两个主要部分：

- `roles`：定义可用角色、权限和范围
- `roleMapping`：将用户或 OIDC 组映射到特定角色

### 配置示例

```yaml
roles:
  - name: admin
    description: 具有完全访问权限的管理员角色
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "*"
  - name: viewer
    description: 具有只读访问权限的查看者角色
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "get"
  - name: dev-admin
    description: 开发命名空间的管理员
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "development"
    verbs:
      - "*"

roleMapping:
  - name: admin
    users:
      - alice
      - bob
    oidcGroups:
      - admin-group
  - name: viewer
    users:
      - "*"
  - name: dev-admin
    users:
      - dev1
      - dev2
    oidcGroups:
      - developers
```

## 角色定义

每个角色指定：

| 字段          | 描述               | 示例                                                                    |
| ------------- | ------------------ | ----------------------------------------------------------------------- |
| `name`        | 角色标识符         | `admin`、`viewer`                                                       |
| `description` | 简要描述（可选）   | `具有完全访问权限的管理员角色`                                          |
| `clusters`    | 角色适用的集群     | `["*"]` 表示所有集群，`["dev", "test"]` 表示特定集群                    |
| `resources`   | 角色可访问的资源   | `["*"]` 表示所有资源，`["pods", "deployments"]` 表示特定资源            |
| `namespaces`  | 角色适用的命名空间 | `["*"]` 表示所有命名空间，`["default", "kube-system"]` 表示特定命名空间 |
| `verbs`       | 允许的操作         | `["*"]` 表示所有操作，`["get"]` 表示只读操作                            |

### 支持的动词

- 通用资源动词：`get`、`create`、`update`、`delete`
- Pod 特定动词：`exec`、`log`（用于 Pod 终端和日志访问）
- 节点特定动词：`exec`（用于节点终端访问）
- 通配符：`*`（所有操作）

## 角色映射

角色映射部分将用户或 OIDC 组连接到角色：

| 字段         | 描述             | 示例                                        |
| ------------ | ---------------- | ------------------------------------------- |
| `name`       | 要分配的角色名称 | 必须匹配已定义的角色名称                    |
| `users`      | 用户名列表       | `["alice", "bob"]`，或 `["*"]` 表示所有用户 |
| `oidcGroups` | OIDC 组名列表    | `["admins", "developers"]`                  |

## 部署

### 使用 Helm Chart

```yaml
roleConfig:
  roles:
    - name: admin
      description: Administrator role with full access.
      clusters:
        - '*'
      resources:
        - '*'
      namespaces:
        - '*'
      verbs:
        - '*'
    - name: viewer
      description: Viewer role with read-only access
      clusters:
        - '*'
      resources:
        - '*'
      namespaces:
        - '*'
      verbs:
        - 'get'
  roleMapping:
    # map specific users to the admin role
    # - name: admin
    #   oidcGroups:
    #     - admins
    # - name: viewer
    #   users:
    #     - 'zxh326'
```

### 使用 ConfigMap

1. 使用您的 RBAC 配置创建 ConfigMap：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kite-rbac
  namespace: kite-system
data:
  roles.yaml: |
    roles:
      - name: admin
        description: 管理员角色
        clusters: ["*"]
        resources: ["*"]
        namespaces: ["*"]
        verbs: ["*"]
      # ... 其他角色
    roleMapping:
      - name: admin
        users:
          - admin@example.com
      # ... 其他映射
```

2. 在 Kite 部署中挂载 ConfigMap：

```yaml
volumes:
  - name: rbac-config
    configMap:
      name: kite-rbac
containers:
  - name: kite
    volumeMounts:
      - name: rbac-config
        mountPath: /app/config/rbac
```

### 使用环境变量

设置 `RBAC_CONFIG_PATH` 环境变量指向您的 RBAC 配置文件：

```sh
RBAC_CONFIG_PATH=/path/to/roles.yaml
```

## 动态更新

`roles.yaml` 文件在更改时会自动重新加载：

- 当作为 ConfigMap 挂载时，更改大约需要 1 分钟才能应用
- 当存储为文件时，更改会立即应用

## 最佳实践

1. **最小权限原则**：为每个角色授予所需的最小权限
2. **使用命名空间角色**：可能时将访问限制在特定命名空间
3. **避免通配符用户**：在生产环境中明确列出用户，而非使用 `"*"`
4. **定期审计**：定期审查角色映射
5. **测试访问**：在更改后验证权限是否按预期工作

## 示例场景

### 多租户设置

```yaml
roles:
  - name: team-a-admin
    clusters: ["*"]
    resources: ["*"]
    namespaces: ["team-a"]
    verbs: ["*"]
  - name: team-b-admin
    clusters: ["*"]
    resources: ["*"]
    namespaces: ["team-b"]
    verbs: ["*"]

roleMapping:
  - name: team-a-admin
    oidcGroups: ["team-a"]
  - name: team-b-admin
    oidcGroups: ["team-b"]
```

### 具有日志查看权限的只读访问

```yaml
roles:
  - name: log-viewer
    clusters: ["*"]
    resources: ["pods"]
    namespaces: ["*"]
    verbs: ["get", "log"]

roleMapping:
  - name: log-viewer
    users: ["logger@example.com"]
    oidcGroups: ["support-team"]
```
