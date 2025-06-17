# Prometheus Setup Guide for Kite

This guide will help you set up Prometheus monitoring for the Kite Kubernetes Dashboard.

## Overview

Kite integrates with Prometheus to provide:

- Real-time cluster resource metrics
- Historical data visualization
- Pod and container resource usage tracking

## Prerequisites

- A running Kubernetes cluster
- `kubectl` configured to access your cluster
- Cluster admin privileges

## Installation

### Option 1: Using Kube-Prometheus-Stack (Recommended)

For detailed installation options, see the [kube-prometheus-stack documentation](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack).

### Option 2: Manual Installation

Your Prometheus setup should include:

follow their docs to setup.

- **[Prometheus Server](https://prometheus.io/docs/prometheus/latest/installation/)** - Collects and stores metrics

- **[kube-state-metrics](https://github.com/kubernetes/kube-state-metrics)** - Provides Kubernetes object metrics

- **[metrics-server](https://github.com/kubernetes-sigs/metrics-server)** - Provides container resource metrics

- **Collect kubelet cAdvisor metrics** - For detailed node and pod metrics

## Configuration

### Connect Kite to Prometheus

Set the `PROMETHEUS_URL` environment variable when running Kite

---

Once configured, your Kite dashboard will display comprehensive cluster monitoring and metrics data.
