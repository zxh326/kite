# RBAC Configuration Guide

This guide explains how to configure Role-Based Access Control (RBAC) in Kite to manage user permissions and access rights.

## Overview

Kite's RBAC system allows you to:

- Define custom roles with specific permissions
- Assign roles to users or OIDC groups
- Control access at cluster, namespace, and resource levels
- Specify allowed actions (verbs) for each role

## Configuration File Structure

The RBAC configuration is defined in a `roles.yaml` file with two main sections:

- `roles`: Defines available roles, their permissions, and scope
- `roleMapping`: Maps users or OIDC groups to specific roles

### Example Configuration

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
  - name: dev-admin
    description: Admin for development namespace
    clusters:
      - "*"
    resources:
      - "*"
    namespaces:
      - "development"
    verbs:
      - "*"

roleMapping:
  - name: admin
    users:
      - alice
      - bob
    oidcGroups:
      - admin-group
  - name: viewer
    users:
      - "*"
  - name: dev-admin
    users:
      - dev1
      - dev2
    oidcGroups:
      - developers
```

## Role Definition

Each role specifies:

| Field         | Description                    | Example                                                    |
| ------------- | ------------------------------ | ---------------------------------------------------------- |
| `name`        | Role identifier                | `admin`, `viewer`                                          |
| `description` | Brief description (optional)   | `Administrator role with full access`                      |
| `clusters`    | Clusters the role applies to   | `["*"]` for all, `["dev", "test"]` for specific            |
| `resources`   | Resources the role can access  | `["*"]` for all, `["pods", "deployments"]` for specific    |
| `namespaces`  | Namespaces the role applies to | `["*"]` for all, `["default", "kube-system"]` for specific |
| `verbs`       | Allowed actions                | `["*"]` for all, `["get"]` for read-only                   |

### Supported Verbs

- Common resource verbs: `get`, `create`, `update`, `delete`
- Pod-specific verbs: `exec`, `log` (for pod terminal and log access)
- Node-specific verbs: `exec` (for node terminal access)
- Wildcard: `*` (all actions)

## Role Mapping

The role mapping section connects users or OIDC groups to roles:

| Field        | Description              | Example                                      |
| ------------ | ------------------------ | -------------------------------------------- |
| `name`       | Role name to assign      | Must match a defined role name               |
| `users`      | List of usernames        | `["alice", "bob"]`, or `["*"]` for all users |
| `oidcGroups` | List of OIDC group names | `["admins", "developers"]`                   |

## Deployment

### Using ConfigMap

1. Create a ConfigMap with your RBAC configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kite-rbac
  namespace: kite-system
data:
  roles.yaml: |
    roles:
      - name: admin
        description: Administrator role
        clusters: ["*"]
        resources: ["*"]
        namespaces: ["*"]
        verbs: ["*"]
      # ... additional roles
    roleMapping:
      - name: admin
        users:
          - admin@example.com
      # ... additional mappings
```

2. Mount the ConfigMap in your Kite deployment:

```yaml
volumes:
  - name: rbac-config
    configMap:
      name: kite-rbac
containers:
  - name: kite
    volumeMounts:
      - name: rbac-config
        mountPath: /app/config/rbac
```

### Using Environment Variable

Set the `RBAC_CONFIG_PATH` environment variable to point to your RBAC configuration file:

```sh
RBAC_CONFIG_PATH=/path/to/roles.yaml
```

## Dynamic Updates

The `roles.yaml` file will automatically be reloaded when changed:

- When mounted as a ConfigMap, changes take about 1 minute to be applied
- When stored as a file, changes are applied immediately

## Best Practices

1. **Principle of Least Privilege**: Grant minimal permissions needed for each role
2. **Use Namespaced Roles**: Restrict access to specific namespaces when possible
3. **Avoid Wildcard Users**: Explicitly list users instead of using `"*"` in production
4. **Audit Regularly**: Review role mappings periodically
5. **Test Access**: Verify permissions work as expected after changes

## Example Scenarios

### Multi-Tenant Setup

```yaml
roles:
  - name: team-a-admin
    clusters: ["*"]
    resources: ["*"]
    namespaces: ["team-a"]
    verbs: ["*"]
  - name: team-b-admin
    clusters: ["*"]
    resources: ["*"]
    namespaces: ["team-b"]
    verbs: ["*"]

roleMapping:
  - name: team-a-admin
    oidcGroups: ["team-a"]
  - name: team-b-admin
    oidcGroups: ["team-b"]
```

### Read-Only Access with Log Viewing

```yaml
roles:
  - name: log-viewer
    clusters: ["*"]
    resources: ["pods"]
    namespaces: ["*"]
    verbs: ["get", "log"]

roleMapping:
  - name: log-viewer
    users: ["logger@example.com"]
    oidcGroups: ["support-team"]
```
