# Resource History

Kite records the complete operation history of Kubernetes resources including create, update, delete, and all deployment management actions. On the details page, you can view the time of each change, the operator, the operation type, whether it succeeded, and the YAML differences before and after the change. You can also roll back to any previous configuration when needed.

:::: tip
You need the appropriate resource "read" permission to view its history; "write" permission is required to edit or roll back.
::::

## Feature Overview

- **Comprehensive Tracking**: Records all operations on resources:
  - Standard operations: create, update, delete, apply
  - Deployment actions: edit, scale, restart, rollback, suspend, resume
- **Tracking Dimensions**: cluster, resource type, namespace, resource name, operation type, operator, success status, and error message
- **Color-Coded Operation Types**: Each operation has a unique color badge for easy visual identification:
  - 🔵 **Edit**: Blue - YAML configuration modifications
  - 🟢 **Resume**: Green - FluxCD auto-sync resumed
  - 🟡 **Rollback**: Amber - Helm release rolled back to previous revision
  - ⚪ **Restart**: Gray - Deployment pods restarted
  - 🔵 **Scale**: Cyan - Replica count changed
  - 🟠 **Suspend**: Orange - FluxCD auto-sync paused
- **Change Comparison**: Built-in YAML diff viewer with three-way comparison:
  - Compare "previous version" vs "current change" (default)
  - Compare with "version currently in the cluster"
  - Automatically ignores `status` and `managedFields` fields to focus on actual configuration changes
- **Rollback Support**: One-click rollback to any previous working configuration
- **Audit Trail**: Complete record of who changed what and when, perfect for troubleshooting and compliance
- **Pagination**: Server-side pagination for efficient handling of large history records

## Operation Type Reference

| Type | Color | Description | Example Use Case |
|------|-------|-------------|------------------|
| **edit** | Blue | Direct YAML configuration changes | Updating container image, environment variables, or resource limits |
| **scale** | Cyan | Replica count adjustments | Scaling up for high traffic or down to save resources |
| **restart** | Gray | Pod recreation without config changes | Refreshing pods after external dependency changes |
| **rollback** | Amber | Reverting to a previous Helm revision | Rolling back after a bad deployment |
| **suspend** | Orange | Pausing FluxCD auto-reconciliation | Testing manual changes without GitOps interference |
| **resume** | Green | Re-enabling FluxCD auto-sync | Returning to GitOps-managed state after testing |

## Best Practices

1. **Before Rollback**: Check the Resource History to identify which version was stable
2. **After Changes**: Review the History tab to confirm your changes were recorded correctly
3. **Troubleshooting**: Use the color-coded badges to quickly identify recent changes that might have caused issues
4. **Compliance**: Export history records for audit trails and incident reports
5. **Team Coordination**: Check history to see what teammates have changed recently

## Screenshots

![History list with color-coded operation types](/screenshots/history1.png)
*Resource History table showing operation types with color-coded badges*

![History diff viewer](/screenshots/history2.png)
*YAML diff comparison between versions*


