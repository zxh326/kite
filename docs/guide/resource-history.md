# Resource History

Kite records the operation history of Kubernetes resources (create, update, delete, and changes via YAML Apply). On the details page, you can view the time of each change, the operator, whether it succeeded, and the YAML differences before and after the change, and roll back as needed.

:::: tip
You need the appropriate resource "read" permission to view its history; "write" permission is required to edit or roll back.
::::

## Feature Overview

- Tracking dimensions: cluster, resource type, namespace, resource name, operation type (create/update/delete/apply), operator, success status, and error message.
- Change comparison: Built-in YAML diff viewer. By default, it compares the "previous version" and the "current change"; you can also switch to compare with the "version currently in the cluster". The diff automatically ignores `status` and `managedFields` to focus on configuration differences.

![History list](/screenshots/history1.png)

![History diff](/screenshots/history2.png)


