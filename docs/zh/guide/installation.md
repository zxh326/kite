# 安装指南

本指南提供在 Kubernetes 环境中安装 Kite 的详细说明。

## 前提条件

- 具有集群管理员访问权限的 `kubectl`
- Helm v3（用于 Helm 安装方式）

## 安装选项

::: info
Kite 可以开箱即用，无需最少的配置。

- 如果使用 CLI 运行，默认使用您的本地 kubeconfig。
- 如果在 Kubernetes 中运行，默认使用集群内配置。

如果没有任何身份验证配置，所有用户都可以访问仪表盘，但仅具有只读权限。

对于更高级的设置，请参阅 [配置](../config/) 部分。
:::

### 选项 1：Helm Chart（推荐）

使用 Helm 提供了最灵活的配置和升级方式：

```bash
# 添加 Kite 仓库
helm repo add kite https://zxh326.github.io/kite/charts

# 更新仓库信息
helm repo update

# 使用默认配置安装
helm install kite kite/kite -n kite-system --create-namespace
```

#### 自定义 Helm 安装

您可以通过创建 values 文件来自定义安装：

完整的 values 配置可从 [Chart Values](../config/chart-values) 获取。

然后使用您的自定义值安装：

```bash
helm install kite kite/kite -n kite-system -f values.yaml
```

### 选项 2：YAML 清单

对于简单部署，您可以直接应用安装 YAML：

```bash
kubectl apply -f https://raw.githubusercontent.com/zxh326/kite/main/deploy/install.yaml
```

此方法使用默认设置安装 Kite。对于更高级的配置，请考虑使用 Helm chart。

## 访问 Kite

### 使用端口转发

在测试期间访问 Kite 的最简单方法：

```bash
kubectl port-forward -n kite-system svc/kite 8080:8080
```

### 使用 LoadBalancer 服务

如果您的集群支持 LoadBalancer 服务，您可以暴露 Kite：

```bash
kubectl patch svc kite -n kite-system -p '{"spec": {"type": "LoadBalancer"}}'
```

获取分配的 IP：

```bash
kubectl get svc kite -n kite-system
```

### 使用 Ingress

对于生产部署，配置 Ingress 控制器以使用 TLS 暴露 Kite：

::: tip
Kite 的日志和 Web 终端功能需要提供 websocket 支持。

某些 Ingress 控制器可能需要额外的配置才能正确处理 websocket。
:::

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kite
  namespace: kite-system
spec:
  ingressClassName: nginx
  rules:
    - host: kite.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kite
                port:
                  number: 8080
  tls:
    - hosts:
        - kite.example.com
      secretName: kite-tls
```

## 验证安装

要验证 Kite 是否正常运行：

```bash
kubectl get pods -n kite-system
```

所有 pod 都应显示 `Running` 状态，`1/1` 就绪。

## 升级

### Helm 升级

```bash
helm repo update
helm upgrade kite kite/kite -n kite-system
```

### YAML 升级

```bash
kubectl apply -f https://raw.githubusercontent.com/zxh326/kite/main/deploy/install.yaml
```

## 卸载

### Helm 卸载

```bash
helm uninstall kite -n kite-system
```

### YAML 卸载

```bash
kubectl delete -f https://raw.githubusercontent.com/zxh326/kite/main/deploy/install.yaml
```

## 后续步骤

安装 Kite 后，您可能想要：

- [配置 OAuth 认证](../config/oauth-setup)
- [设置 Prometheus 监控](../config/prometheus-setup)
- [配置 RBAC](../config/rbac-config)
- [设置多集群支持](../config/multi-cluster)
