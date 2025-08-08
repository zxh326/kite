# Installation

This guide provides detailed instructions for installing Kite in your Kubernetes environment.

## Prerequisites

- `kubectl` with cluster admin access
- Helm v3 (for Helm installation method)

## Installation Options

::: info
Kite works out of the box with minimal configuration.

- If running with CLI, it defaults to using your local kubeconfig.
- If running in Kubernetes, it defaults to using the in-cluster configuration.

Without any authentication configuration, all users can access the dashboard, but only with read-only permissions.

For more advanced setups, see the [Configuration](../config/) section.
:::

### Option 1: Helm Chart (Recommended)

Using Helm provides the most flexibility for configuration and upgrades:

```bash
# Add the Kite repository
helm repo add kite https://zxh326.github.io/kite

# Update repository information
helm repo update

# Install with default configuration
helm install kite kite/kite -n kite-system --create-namespace
```

#### Customizing Helm Installation

You can customize the installation by creating a values file:

Full values configuration can be found in the [Chart Values](../config/chart-values) document.

Then install using your custom values:

```bash
helm install kite kite/kite -n kite-system -f values.yaml
```

### Option 2: YAML Manifest

For simple deployments, you can apply the installation YAML directly:

```bash
kubectl apply -f https://raw.githubusercontent.com/zxh326/kite/main/deploy/install.yaml
```

This method installs Kite with default settings. For more advanced configuration, consider using the Helm chart.

## Accessing Kite

### Using Port Forwarding

The simplest way to access Kite during testing:

```bash
kubectl port-forward -n kite-system svc/kite 8080:8080
```

### Using LoadBalancer Service

If your cluster supports LoadBalancer services, you can expose Kite:

```bash
kubectl patch svc kite -n kite-system -p '{"spec": {"type": "LoadBalancer"}}'
```

Get the assigned IP:

```bash
kubectl get svc kite -n kite-system
```

### Using Ingress

For production deployments, configure an Ingress controller to expose Kite with TLS:

::: tip
Kite's log and web terminal features require websocket support.

Some Ingress controllers may require additional configuration to handle websockets correctly.
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

## Verifying Installation

To verify that Kite is running properly:

```bash
kubectl get pods -n kite-system
```

All pods should show `Running` status with `1/1` ready.

## Upgrading

### Helm Upgrade

```bash
helm repo update
helm upgrade kite kite/kite -n kite-system
```

### YAML Upgrade

```bash
kubectl apply -f https://raw.githubusercontent.com/zxh326/kite/main/deploy/install.yaml
```

## Uninstalling

### Helm Uninstall

```bash
helm uninstall kite -n kite-system
```

### YAML Uninstall

```bash
kubectl delete -f https://raw.githubusercontent.com/zxh326/kite/main/deploy/install.yaml
```

## Next Steps

After installing Kite, you may want to:

- [Configure OAuth Authentication](../config/oauth-setup)
- [Set up Prometheus Monitoring](../config/prometheus-setup)
- [Configure RBAC](../config/rbac-config)
- [Set up Multi-Cluster Support](../config/multi-cluster)
