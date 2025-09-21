# Workload Metrics Time Range Support - Testing Guide

## What was implemented

The issue was that workload metrics (deployments, statefulsets, daemonsets) did not properly support time ranges when querying Prometheus. The UI was already calling the API with time range parameters, but the backend was ignoring them for workload-level metrics.

## Changes Made

### Backend Changes

1. **Added `GetWorkloadMetrics` function** that supports label selectors and time ranges
2. **Added helper functions** for each metric type with label selector support:
   - `GetCPUUsageByLabelSelector`
   - `GetMemoryUsageByLabelSelector`
   - `GetNetworkInUsageByLabelSelector`
   - `GetNetworkOutUsageByLabelSelector`
   - `GetDiskReadUsageByLabelSelector`
   - `GetDiskWriteUsageByLabelSelector`

3. **Updated the handler** to use workload metrics when `labelSelector` is provided

### API Behavior

**Before the fix:**
- URL: `/api/v1/prometheus/pods/default/nginx-deployment-abc123/metrics?duration=1h&labelSelector=app=nginx`
- Backend: Used `GetPodMetrics()` for single pod, ignored labelSelector
- Result: Only metrics for the specific pod, not aggregated across all workload pods

**After the fix:**
- URL: `/api/v1/prometheus/pods/default/nginx-deployment-abc123/metrics?duration=1h&labelSelector=app=nginx`
- Backend: Uses `GetWorkloadMetrics()` when labelSelector is present
- Result: Aggregated metrics across all pods matching `app=nginx`, respecting the 1h time range

## How to Test

### 1. Frontend Testing (should work automatically)

Navigate to a deployment, statefulset, or daemonset detail page:
- Go to the "Monitor" tab
- Use the time range selector (30m, 1h, 24h)
- Metrics should now aggregate across all pods in the workload
- Time range changes should update the data accordingly

### 2. API Testing

You can test the API directly:

```bash
# Test individual pod metrics (no label selector)
curl "http://localhost:8080/api/v1/prometheus/pods/default/my-pod/metrics?duration=1h"

# Test workload metrics (with label selector) 
curl "http://localhost:8080/api/v1/prometheus/pods/default/deployment-pod/metrics?duration=1h&labelSelector=app=myapp,tier=frontend"
```

## Supported Time Ranges

The following time ranges are supported for both pod and workload metrics:
- `30m` - 30 minutes (15-second intervals)
- `1h` - 1 hour (1-minute intervals)  
- `24h` - 24 hours (5-minute intervals)

## Metrics Included

All standard container metrics are aggregated for workloads:
- CPU usage (cores)
- Memory usage (MB)
- Network incoming (bytes/sec)
- Network outgoing (bytes/sec)
- Disk read (bytes/sec)
- Disk write (bytes/sec)

## Frontend Components Already Working

The UI components were already properly implemented:
- Deployment detail page uses `PodMonitoring` with `labelSelector`
- StatefulSet detail page uses `PodMonitoring` with `labelSelector`
- DaemonSet detail page uses `PodMonitoring` with `labelSelector`
- Time range selector is already present and functional
- All pages pass the correct `labelSelector` derived from workload specs

The fix was entirely on the backend to properly handle the `labelSelector` parameter in Prometheus queries.