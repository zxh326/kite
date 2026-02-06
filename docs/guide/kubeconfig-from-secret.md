# Kubeconfig from Kubernetes Secret

This feature allows Kite to automatically read kubeconfigs from Kubernetes secrets instead of storing them in the database.

## Overview

Kite's secret reference feature supports:

- **Dynamic configuration**: Kubeconfigs are automatically reloaded during the synchronization cycle (every minute)
- **Centralized management**: Use tools like FluxCD or ArgoCD to manage your secrets
- **Enhanced security**: Kubeconfigs remain in Kubernetes and are not stored in the database
- **Automatic updates**: Kite detects changes to secret content and reloads clients

## Prerequisites

- Kite must be deployed in `in-cluster` mode (with access to the Kubernetes API)
- Kite's ServiceAccount already has read permissions on secrets (no additional RBAC configuration needed)

## Usage

### 1. Create a Secret with Your Kubeconfig or use an existing one in next steps

With kubectl:
```bash
kubectl create secret generic kubeconfig-prod \
  --from-file=config=/path/to/kubeconfig \
  -n kite-system
```

Or with a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: kubeconfig-prod
  namespace: kite-system
type: Opaque
stringData:
  config: |
    apiVersion: v1
    kind: Config
    clusters:
    - cluster:
        server: https://prod-cluster.example.com
        certificate-authority-data: LS0t...
      name: prod-cluster
    contexts:
    - context:
        cluster: prod-cluster
        user: admin
      name: prod-context
    current-context: prod-context
    users:
    - name: admin
      user:
        client-certificate-data: LS0t...
        client-key-data: LS0t...
```

### 2. Create the Cluster in Kite via API

```bash
curl -X POST http://kite-url/api/v1/clusters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production",
    "description": "Production cluster",
    "secret_name": "kubeconfig-prod",
    "secret_namespace": "kite-system",
    "secret_key": "config",
    "enable": true
  }'
```

### 3. Or via the Web Interface

In the Kite interface, when adding a cluster:
- **Name**: `production`
- **Secret Name**: `kubeconfig-prod`
- **Secret Namespace**: `kite-system`
- **Secret Key**: `config`
- Leave the **Config** field empty

## How It Works

1. **Automatic synchronization**: Kite checks every minute if the secret content has changed
2. **Change detection**: If the content changes, Kite automatically reloads the Kubernetes client
3. **Fallback**: If the `secret_name` field is empty, Kite uses the classic `config` field

## Limitations

- The secret must be in a namespace accessible by Kite's ServiceAccount
- Change detection delay is 1 minute (sync cycle)
- Kite must be in `in-cluster` mode to access secrets

## Troubleshooting

### Logs

Check Kite logs to see synchronization messages:

```bash
kubectl logs -n kite-system deployment/kite | grep -i secret
```

You should see:
```
Reading kubeconfig for cluster production from secret kite-system/kubeconfig-prod:config
```

### Common Issues

**`failed to get secret: secrets "kubeconfig-prod" is forbidden`**

Check the RBAC permissions of the ServiceAccount.

**`key config not found in secret`**

Verify that the key exists in the secret:
```bash
kubectl get secret kubeconfig-prod -n kite-system -o jsonpath='{.data}'
```

**`failed to get in-cluster config`**

Kite is not deployed in in-cluster mode or the ServiceAccount is not mounted.
