# Prometheus Setup Guide

This guide explains how to configure Kite's monitoring integration with Prometheus to achieve real-time metrics and monitoring functionality.

## Overview

Kite's integration with Prometheus provides:

- Real-time cluster resource metrics
- Historical data visualization
- Pod and container resource usage tracking
- Node performance monitoring

## Prerequisites

- A running Kubernetes cluster
- `kubectl` configured with cluster access permissions
- Cluster administrator privileges (for Prometheus installation)

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

Users with the **admin** role can access the settings entry in the upper right corner of the page to enter the cluster management interface.

Select the cluster that needs to be configured and fill in the Prometheus address.

## Troubleshooting

### Common Issues

1. **No metrics displayed**:

   - Verify Prometheus URL is correct
   - Check Prometheus server is running
   - Ensure Prometheus can scrape metrics from targets

2. **Incomplete metrics**:

   - Ensure kube-state-metrics is running
   - Check Prometheus configuration includes all necessary scrape jobs
   - Verify target pods/nodes are labeled correctly for Prometheus discovery

3. **Authentication errors**:
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
