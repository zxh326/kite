# RBAC Configuration Guide

This document describes the structure and usage of the `roles.yaml` file for configuring Role-Based Access Control (RBAC) in the system.

## Structure

The configuration file consists of two main sections:

- `roles`: Defines the available roles, their permissions, and scope.
- `roleMapping`: Maps users or OIDC groups to specific roles.

### Roles

Each role specifies:

- `name`: The role identifier.
- `description`: A brief description of the role. (optional)
- `clusters`: List of clusters the role applies to (`'*'` means all).
  - each item is the context name in the kubeconfig.
  - if use in-cluster mode, it should be the `in-cluster` or use `*`.
- `resources`: List of resources the role can access (`'*'` means all).
- `namespaces`: List of namespaces the role applies to (`'*'` means all).
- `verbs`: List of allowed actions
  - common resources support `get`, `create`, `update`, `delete`, or `'*'` for all actions.
  - pods resources support `exec`, `log` actions.
  - nodes resources support `exec` action.

#### Example

```yaml
roles:
  - name: admin
    description: Administrator role with full access
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "*"
  - name: viewer
    description: Viewer role with read-only access
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "get"
  - name: test-cluster-admin
    description: Admin role with full access for test cluster
    clusters:
      - "test-cluster"
    resources:
      - "*"
    namespaces:
      - "*"
    verbs:
      - "*"
```

### Role Mapping

Maps users or OIDC groups to roles.

- `name`: The role to assign.
- `users`: List of usernames (`'*'` means all users).
- `oidcGroups`: List of OIDC group names.

#### Example

```yaml
roleMapping:
  - name: admin
    users:
      - alice
      - bob
    oidcGroups:
      - admins
  - name: viewer
    users:
      - "*"
```

## Usage

- Assign users or groups to roles according to their required permissions.
- Use `'*'` to grant access to all clusters, resources, namespaces, verbs, or users.
- The `admin` role grants full access, while the `viewer` role is restricted to read-only operations.

## NOTE

- Ensure that sensitive roles (e.g., `admin`) are only mapped to trusted users or groups.
- The `roles.yaml` file will automatically be loaded when changed, If using configmap mount, it will take about 1 minute to take effect.
