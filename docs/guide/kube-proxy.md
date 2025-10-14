---
outline: deep
---

# Kube Proxy

Kite has a built-in kubectl Proxy feature that allows you to access Pods or Services directly through Kite without running `kubectl port-forward` locally.

## How to Use

1.  Navigate to the details page of the Pod or Service you want to access.
2.  In the `Ports` section, click to access directly.

![Kube Proxy](../screenshots/kube-proxy1.png)

![Kube Proxy](../screenshots/kube-proxy2.png)

## Notes

1. If the Pod or Service you need to access is a front-end service, you may not be able to access it properly.
2. Only HTTP services are supported for proxying.
