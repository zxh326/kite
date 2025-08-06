# Web Terminal

Kite provides an integrated web terminal that allows you to execute commands directly within your pods and nodes through your browser, eliminating the need for local command-line tools.

![Web Terminal](/screenshots/terminal.png)

::: tip

Ensure that the user has `pods/exec` permission, otherwise the web terminal will not be able to connect to the pod.

Ensure that the user has `nodes/exec` permission, otherwise the web terminal will not be able to connect to the node.

Refer to the [RBAC Configuration Guide](../config/rbac-config) section for more information.
:::
