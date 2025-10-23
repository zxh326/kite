# 常见问题 (FAQ)

## 数据共享

默认情况下，Kite 不会收集任何分析数据。

如果您希望帮助改进产品，可以将环境变量 `ENABLE_ANALYTICS` 设置为 `true`。

Kite 将使用 umami 收集极少的匿名使用数据。

源代码可在 [这里](https://github.com/zxh326/kite/blob/main/pkg/utils/utils.go#L10-L16) 找到。

## 权限问题

如果在访问资源时，遇到如下错误提示，

```txt
用户 admin 没有权限在集群 in-cluster 的命名空间 kite 中执行 获取 configmaps
```

表示用户 `admin` 没有权限访问 `kite` 命名空间中的 `configmaps` 资源。

你需要参考 [RBAC 配置指南](./config/rbac-config) 来配置用户的权限。

## 托管 Kubernetes 集群连接问题

如果您使用托管 Kubernetes 集群（AKS、EKS、GKE 等）并在将集群添加到 Kite 时遇到身份验证错误，这通常是因为默认的 kubeconfig 使用了需要 CLI 工具（如 `kubelogin`、`aws` 或 `gcloud`）的 `exec` 插件。

Kite 作为服务端应用运行，无法执行这些客户端身份验证工具。相反，您应该使用基于 Service Account token 的身份验证。

请参考[托管 Kubernetes 集群配置指南](./config/managed-k8s-auth)，了解如何创建和使用 Service Account token 进行身份验证的详细说明。

## 如何更改字体

Kite 默认提供三种字体：系统默认、`Maple Mono` 和 `JetBrains Mono`。

如果您想使用其他字体，则需要自己构建项目。

用 make 构建 kite，并在 `./ui/src/index.css` 中更改字体

```css
@font-face {
  font-family: "Maple Mono";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url(https://cdn.jsdelivr.net/fontsource/fonts/maple-mono@latest/latin-400-normal.woff2)
      format("woff2"), url(https://cdn.jsdelivr.net/fontsource/fonts/maple-mono@latest/latin-400-normal.woff)
      format("woff");
}

body {
  font-family: "Maple Mono", var(--font-sans);
}
```

## 我如何为 Kite 做出贡献？

我们欢迎贡献！您可以：

- 在 [GitHub Issues](https://github.com/zxh326/kite/issues) 上报告错误和功能请求
- 提交拉取请求
- 改进文档
- 分享反馈和使用案例

## 我在哪里可以获得帮助？

您可以通过以下方式获得支持：

- [GitHub Issues](https://github.com/zxh326/kite/issues) 用于提交错误报告和功能请求
- [Slack Community](https://join.slack.com/t/kite-dashboard/shared_invite/zt-3amy6f23n-~QZYoricIOAYtgLs_JagEw) 用于提问和社区支持

---

**没有找到您要找的内容？** 欢迎在 GitHub 上[提交问题](https://github.com/zxh326/kite/issues/new)或开始一个[讨论](https://github.com/zxh326/kite/discussions)。
