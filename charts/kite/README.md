# kite

![Version: 0.7.6](https://img.shields.io/badge/Version-0.7.6-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square) ![AppVersion: latest](https://img.shields.io/badge/AppVersion-latest-informational?style=flat-square)

A Helm chart for Kubernetes Dashboard - Kite

## Installation

### Add Helm Repository

```bash
helm repo add kite https://zxh326.github.io/kite
helm repo update
```

### Install Chart

```bash
# Install in kube-system namespace (recommended)
helm install kite kite/kite -n kube-system

# Or install in custom namespace
helm install kite kite/kite -n my-namespace --create-namespace
```

### Upgrade Chart

```bash
helm upgrade kite kite/kite -n kube-system
```

### Uninstall Chart

```bash
helm uninstall kite -n kube-system
```

### Chart Values

[Chart Values](https://kite.zzde.me/config/chart-values)
