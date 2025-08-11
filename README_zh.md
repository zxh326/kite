# Kite - 现代化的 Kubernetes Dashboard

<div align="center">

<img src="./docs/assets/logo.svg" alt="Kite Logo" width="128" height="128">

_一个现代化、直观的 Kubernetes Dashboard_

[![Go Version](https://img.shields.io/badge/Go-1.24+-00ADD8?style=flat&logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=flat&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-Apache-green.svg)](LICENSE)

[**在线 Demo**](https://kite-demo.zzde.me) | [**文档**](https://kite.zzde.me)
<br>
[English](./README.md) | **中文**

</div>

Kite 是一个轻量级、现代化的 Kubernetes Dashboard，为管理和监控您的 Kubernetes 集群提供了一个直观的界面。它提供实时指标、全面的资源管理、多集群支持和优美的用户体验。

> [!WARNING]
> 本项目正在快速迭代开发中，使用方式和 API 都有可能变化。

![Dashboard Overview](docs/screenshots/overview.png)
_全面的集群概览，包含实时指标和资源统计_

## ✨ 功能特性

### 🎯 **现代化的用户体验**

- 🌓 **多主题支持** - 暗色/亮色/彩色主题，并能自动适应系统偏好
- 🔍 **高级搜索** - 支持跨所有资源的全局搜索

### 🏘️ **多集群管理**

- 🔄 **无缝集群切换** - 单击即可在多个 Kubernetes 集群之间切换
- 📊 **分集群监控** - 每个集群可独立配置 Prometheus
- ⚙️ **Kubeconfig 集成** - 自动从您的 kubeconfig 文件中发现集群

### 🔍 **全面的资源管理**

- 📋 **全资源覆盖** - 支持 Pods, Deployments, Services, ConfigMaps, Secrets, PVs, PVCs 等
- 📄 **实时 YAML 编辑** - 内置 Monaco 编辑器，支持语法高亮和校验
- 📊 **详细的资源视图** - 提供容器、卷、事件和状况等深入信息
- 🔗 **资源关系可视化** - 可视化相关资源之间的连接（例如，Deployment → Pods）
- ⚙️ **资源操作** - 直接从 UI 创建、更新、删除、扩缩容和重启资源
- 🔄 **自定义资源** - 完全支持 CRD (Custom Resource Definitions)
- 🏷️ **镜像标签快速选择器** - 基于 Docker 和容器镜像仓库 API，轻松选择和更改容器镜像标签

### 📈 **监控与可观测性**

- 📊 **实时指标** - 由 Prometheus 驱动的 CPU、内存和网络使用情况图表
- 📋 **集群概览** - 全面的集群健康状况和资源统计
- 📝 **实时日志** - 实时流式传输 Pod 日志，支持过滤和搜索
- 💻 **网页终端** - 直接在浏览器中进入 Pod 执行命令

### 🔐 **认证**

- 🛡️ **OAuth 集成** - 支持 GitHub 和自定义 OAuth 提供商
- 🔑 **用户名/密码** - 使用环境变量进行简单认证
- 🔒 **基于角色的访问控制** - 为用户和组提供细粒度的访问控制

---

## 🚀 快速开始

有关详细说明，请参阅[文档](https://kite.zzde.me/guide/installation.html)。

### Docker

要使用 Docker 运行 Kite，您可以使用预构建的镜像：

> 注意：示例角色配置中，所有用户都具有查看者权限。

> 有关配置角色和权限的更多详细信息，请参阅[角色配置](https://kite.zzde.me/config/rbac-config.html)。

```bash
wget https://raw.githubusercontent.com/zxh326/kite/refs/heads/main/docs/roles.yaml
docker run --rm -p 8080:8080 -v ./roles.yaml:/config/roles.yaml -v ~/.kube/config:/home/nonroot/.kube/config ghcr.io/zxh326/kite:latest
```

### 在 Kubernetes 中部署

#### 使用 Helm (推荐)

1.  **添加 Helm 仓库**

    ```bash
    helm repo add kite https://zxh326.github.io/kite
    helm repo update
    ```

2.  **使用默认值安装**

    ```bash
    helm install kite kite/kite -n kube-system
    ```

#### 使用 kubectl

1.  **应用部署清单**

    ```bash
    kubectl apply -f deploy/install.yaml
    # 或在线安装
    kubectl apply -f https://raw.githubusercontent.com/zxh326/kite/refs/heads/main/deploy/install.yaml
    ```

2.  **通过端口转发访问**

    ```bash
    kubectl port-forward -n kube-system svc/kite 8080:80
    ```

### 从源码构建

#### 📋 准备工作

1.  **克隆仓库**

    ```bash
    git clone https://github.com/zxh326/kite.git
    cd kite
    ```

2.  **构建项目**

    ```bash
    make deps
    make build
    ```

3.  **运行服务**

    ```bash
    make run
    ```

---

## 🔍 问题排查

有关问题排查，请参阅[文档](https://kite.zzde.me)。
