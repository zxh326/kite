# Logs

You can easily view the logs of your pods in Kite. The log view provides features like filtering, highlighting, and automatic scrolling.

![Log](/screenshots/log.png)

::: tip
Ensure that the user has `pods/log` permission, otherwise the log feature will not be available.

Refer to the [RBAC Configuration Guide](../config/rbac-config) section for more information.
:::

## Features

### Fullscreen Display

Click the fullscreen button in the upper right corner of the log view to switch the log view to fullscreen mode, which is convenient for viewing a large amount of log information.

The shortcut `Ctrl + Enter` (Windows/Linux) or `Cmd + Enter` (macOS) can also switch between fullscreen/non-fullscreen mode.

### Filter Logs

After entering a keyword, the log view will automatically filter out the log lines containing the keyword. At the same time, the keyword is highlighted for quick positioning.

You can also use the shortcut `Ctrl + F` (Windows/Linux) or `Cmd + F` (macOS) to open the filter input box.

### Auto Scroll

By default, the log view automatically scrolls to the latest log line, ensuring that you can view the latest logs in real time.

When you are viewing the logs, auto-scrolling will be paused until you scroll to the bottom of the logs.

### For more features, please refer to the following settings

![Log Features](/screenshots/log-setting.png)
