# Prometheus Setup Guide

This guide explains how to configure Prometheus monitoring integration with Kite to enable real-time metrics and monitoring capabilities.

## Overview

Kite integrates with Prometheus to provide:

- Real-time cluster resource metrics
- Historical data visualization
- Pod and container resource usage tracking
- Node performance monitoring

## Prerequisites

- A running Kubernetes cluster
- `kubectl` configured to access your cluster
- Cluster admin privileges (for Prometheus installation)

## Prometheus Installation Options

### Option 1: Using kube-prometheus-stack (Recommended)

The [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart provides a complete monitoring solution including Prometheus, Alertmanager, and Grafana.

```bash
# Add Prometheus community Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

### Option 2: Manual Prometheus Installation

For more control over the installation, you can manually install Prometheus components:

1. **[Prometheus Server](https://prometheus.io/docs/prometheus/latest/installation/)** - Collects and stores metrics
2. **[kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)** - Provides Kubernetes object metrics
3. **[metrics-server](https://github.com/kubernetes-sigs/metrics-server)** - Provides container resource metrics
4. **Node Exporter** - Collects host system metrics

Follow the official documentation for each component for detailed installation instructions.

## Connecting Kite to Prometheus

### Single Cluster Configuration

Set the `PROMETHEUS_URL` environment variable to point to your Prometheus server:

```sh
PROMETHEUS_URL=http://prometheus-server.monitoring.svc:9090
```

Using Helm:

```yaml
# values.yaml
prometheus:
  url: "http://prometheus-server.monitoring.svc:9090"
```

### Multi-Cluster Configuration

For multi-cluster setups, you can specify a different Prometheus URL for each cluster using the `$CLUSTER_PROMETHEUS_URLS` environment variable pattern:

```shell
# For cluster named "dev-cluster"
DEV_CLUSTER_PROMETHEUS_URL=http://prometheus-dev.monitoring.svc:9090

# For cluster named "prod-cluster"
PROD_CLUSTER_PROMETHEUS_URL=http://prometheus-prod.monitoring.svc:9090
```

Configuring via Helm:

```yaml
# values.yaml
multiCluster:
  # Enable multi-cluster mode by mounting kubeconfig
  enabled: true

  prometheus:
    # Format is cluster name: Prometheus URL
    # production: "https://prometheus.production.example.com"
    # staging: "https://prometheus.staging.example.com"
    # cluster-1: "http://prometheus.cluster-1.svc.cluster.local:9090"
```

### Special Character Handling

For cluster names with special characters, replace them with underscores (`_`), and then capitalize:

Example:

```bash
# Cluster name: arn:aws-cn:eks:cn-north-1:123456:cluster/kite
export ARN_AWS_CN_EKS_CN_NORTH_1_123456_CLUSTER_KITE_PROMETHEUS_URL=http://prometheus-server:9090
```

## Verifying Prometheus Integration

To verify that Kite is successfully connected to Prometheus:

1. Access your Kite dashboard

1. **No metrics displayed**:

   - Verify Prometheus URL is correct
   - Check Prometheus server is running
   - Ensure Prometheus can scrape metrics from targets

1. **Incomplete metrics**:

   - Ensure kube-state-metrics is running
   - Check Prometheus configuration includes all necessary scrape jobs
   - Verify target pods/nodes are labeled correctly for Prometheus discovery

1. **Authentication errors**:
   - If Prometheus requires authentication, ensure credentials are provided
   - Check for TLS configuration if HTTPS is used

### Verifying Prometheus Configuration

To check if Prometheus is correctly scraping targets:

```bash
# Port-forward to Prometheus UI
kubectl port-forward -n monitoring svc/prometheus-server 9090:9090

# Then open in your browser:
# http://localhost:9090/targets
```
