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

## 如何更改字体

你需要自己构建项目

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

## 如何在界面中管理 RBAC 规则

如您所知，Kite 是一个轻量级的 Kubernetes 仪表板，旨在提供简单的集群管理功能。它不需要任何外部依赖。如果将 RBAC 管理功能添加到 UI 中，至少需要一个数据库来存储 RBAC 规则，这将使 Kite 更加复杂。截至目前，我们并不计划引入此类功能。

## Kite 不会做什么

kite 旨在提供一个**轻量化**的 Kubernetes 仪表盘，目标在资源的管理和监控，不会做以下事情：

- 内置的用户系统
- 告警系统
- CI/CD
- 集群的自动安装与维护。

以上的功能往往有更成熟的解决方案可以使用。

## 我如何为Kite做出贡献？

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

**没有找到您要找的内容？** 欢迎在GitHub上[提交问题](https://github.com/zxh326/kite/issues/new)或开始一个[讨论](https://github.com/zxh326/kite/discussions)。