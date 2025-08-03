# Multi-Cluster Setup

Kite provides robust support for managing multiple Kubernetes clusters from a single dashboard. This guide explains how to configure and use the multi-cluster feature.

## Overview

With Kite's multi-cluster support, you can:

- Switch between multiple clusters with a single click
- Configure independent Prometheus instances for each cluster
- Apply different RBAC rules for each cluster

## Configuration Methods

### Method 1: Using a Kubeconfig File

The simplest way to configure multiple clusters is by using a kubeconfig file with multiple contexts:

```yaml
# values.yaml (for Helm)
multiCluster:
  enabled: true

  kubeconfig:
    fromContent: true

    # The kubeconfig file content (plain text)
    # Or pass the file content using Helm's `--set-file` parameter
    #   helm install kite . --set-file multiCluster.kubeconfig.content=/path/to/kubeconfig
    content: |-
      apiVersion: v1
      kind: Config
      current-context: dev-cluster
      contexts:
      - name: dev-cluster
        context:
          cluster: development
          user: admin
      - name: prod-cluster
        context:
          cluster: production
          user: admin
      # ... other contexts, clusters, and users
```

Alternatively, mount it inside the container and specify the kubeconfig path using an environment variable:

```bash
KUBECONFIG=/path/to/kubeconfig
```

### Method 2: Using a Separate Secret Kubeconfig

For more secure management in a production environment:

```yaml
multiCluster:
  enabled: true
  kubeconfig:
    fromContent: false
    existingSecret: "kite-kubeconfig" # Points to the name of the Secret containing the kubeconfig
    secretKey: "kubeconfig" # The key name within the Secret
```

## Cluster-Specific Prometheus Configuration

See the [Prometheus Setup Guide](./prometheus-setup) for details.

## RBAC Configuration for Multi-Cluster

You can define specific RBAC rules for each cluster:

```yaml
# roles.yaml
roles:
  - name: prod-admin
    description: Administrator for the production cluster
    clusters:
      - "prod-cluster"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "*"
  - name: dev-admin
    description: Administrator for the development cluster
    clusters:
      - "dev-cluster"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "*"
  - name: view-all
    description: Read-only access for all clusters
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "get"
      - "list"

roleMapping:
  - name: prod-admin
    users:
      - alice@example.com
    oidcGroups:
      - prod-admins
  - name: dev-admin
    users:
      - bob@example.com
    oidcGroups:
      - dev-admins
  - name: view-all
    oidcGroups:
      - viewers
```
