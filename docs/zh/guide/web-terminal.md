# Web 终端

Kite 提供了集成的 Web 终端，让您可以直接通过浏览器在 Pod 和节点中执行命令，无需使用本地命令行工具。

![Web Terminal](/screenshots/terminal.png)

::: tip

确保访问的用户拥有 `pods/exec` 权限，否则将无法使用 Web 终端链接 Pod。

确保访问的用户拥有 `nodes/exec` 权限，否则将无法使用 Web 终端链接 Node。

参考 [RBAC 配置指南](../config/rbac-config) 部分, 以获取更多信息。
:::
