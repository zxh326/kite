# Prometheus 设置指南

本指南介绍如何配置 Kite 与 Prometheus 的监控集成，以实现实时指标和监控功能。

## 概述

Kite 与 Prometheus 集成提供：

- 实时集群资源指标
- 历史数据可视化
- Pod 和容器资源使用跟踪
- 节点性能监控

## 前提条件

- 一个运行中的 Kubernetes 集群
- 配置了集群访问权限的 `kubectl`
- 集群管理员权限（用于安装 Prometheus）

## Prometheus 安装选项

### 选项 1：使用 kube-prometheus-stack（推荐）

[kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart 提供了完整的监控解决方案，包括 Prometheus、Alertmanager 和 Grafana。

```bash
# 添加 Prometheus 社区 Helm 仓库
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# 安装 kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

### 选项 2：手动安装 Prometheus

如需对安装有更多控制，您可以手动安装 Prometheus 组件：

1. **[Prometheus 服务器](https://prometheus.io/docs/prometheus/latest/installation/)** - 收集并存储指标
2. **[kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)** - 提供 Kubernetes 对象指标
3. **[metrics-server](https://github.com/kubernetes-sigs/metrics-server)** - 提供容器资源指标
4. **Node Exporter** - 收集主机系统指标

按照每个组件的官方文档获取详细的安装说明。

## 连接 Kite 到 Prometheus

### 单集群配置

设置 `PROMETHEUS_URL` 环境变量指向您的 Prometheus 服务器：

```shell
PROMETHEUS_URL=http://prometheus-server.monitoring.svc:9090
```

### 多集群配置

对于多集群设置，您可以使用 `$CLUSTER_PROMETHEUS_URLS` 环境变量模式为每个集群指定不同的 Prometheus URL：

```shell
# 集群名为 "dev-cluster"
DEV_CLUSTER_PROMETHEUS_URL=http://prometheus-dev.monitoring.svc:9090

# 集群名为 "prod-cluster"
PROD_CLUSTER_PROMETHEUS_URL=http://prometheus-prod.monitoring.svc:9090
```

通过 Helm 配置：

```yaml
# values.yaml
multiCluster:
  # Enable multi-cluster mode by mounting kubeconfig
  enabled: true

  prometheus:
    # 格式为集群名：Prometheus URL
    # 如果集群名字中有特殊字符，请使用下划线替换
    # production: "https://prometheus.production.example.com"
    # staging: "https://prometheus.staging.example.com"
    # cluster-1: "http://prometheus.cluster-1.svc.cluster.local:9090"
```

### 特殊字符处理

对于包含特殊字符的集群名称，将它们替换为下划线（`_`），然后大写：

示例：

- 使用环境变量

```bash
# 集群名称: arn:aws-cn:eks:cn-north-1:123456:cluster/kite
export ARN_AWS_CN_EKS_CN_NORTH_1_123456_CLUSTER_KITE_PROMETHEUS_URL=http://prometheus-server:9090
```

- 使用 `values.yaml`

```yaml
multiCluster:
  prometheus:
    arn_aws_cn_eks_cn_north_1_123456_cluster_kite: "http://prometheus-server:9090"
```

## 验证 Prometheus 集成

要验证 Kite 已成功连接到 Prometheus：

1. 访问 Kite 仪表盘
2. 导航至节点或 Pod 详情视图
3. 检查是否存在指标图表
4. 确保指标实时更新

## 故障排除

### 常见问题

1. **未显示指标**：

   - 验证 Prometheus URL 是否正确
   - 检查 Prometheus 服务器是否运行
   - 确保 Prometheus 可以从目标抓取指标

2. **指标不完整**：

   - 确保 kube-state-metrics 正在运行
   - 检查 Prometheus 配置是否包含所有必要的抓取任务
   - 验证目标 Pod/节点是否正确标记以供 Prometheus 发现

3. **认证错误**：
   - 如果 Prometheus 需要认证，确保提供了凭据
   - 如果使用 HTTPS，检查 TLS 配置

### 验证 Prometheus 配置

要检查 Prometheus 是否正确抓取目标：

```bash
# 端口转发到 Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-server 9090:9090

# 然后在浏览器中打开：
# http://localhost:9090/targets
```
