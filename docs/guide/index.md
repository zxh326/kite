# What is Kite?

Kite is a lightweight, modern Kubernetes dashboard that provides an intuitive interface for managing and monitoring your Kubernetes clusters. It offers real-time metrics, comprehensive resource management, multi-cluster support, and a beautiful user experience.

![Dashboard Overview](/screenshots/overview.png)

## Features

- **Multi-Cluster Management**: Seamlessly manage multiple Kubernetes clusters with a single interface.
- **OAuth Authentication**: Secure your dashboard with OAuth, supporting multiple providers like GitHub, Google, and custom OIDC.
- **Role-Based Access Control**: Define custom roles and permissions for users and groups.
- **Comprehensive Monitoring**: Integrate with Prometheus for real-time metrics and visualizations
- **Web Terminal**: Access pods and nodes directly from your browser, eliminating the need for local command-line tools.
- **Global Search**: Quickly find resources across all clusters and namespaces.
- **Image Tag Selection**: Automatically select the latest image tags from your container registry.
- **User-Friendly Interface**: A modern, responsive design that works on both desktop and mobile devices.

## Key Differentiators

Compared to the standard Kubernetes dashboard, Kite offers:

| Feature                   | Kite                              | Standard Kubernetes Dashboard |
| ------------------------- | --------------------------------- | ----------------------------- |
| Multi-Cluster Support     | ✅ Built-in                       | ❌ Limited                    |
| OAuth Integration         | ✅ Multiple providers             | ❌ Limited                    |
| Role-Based Access Control | ✅ Fine-grained                   | ❌ Basic                      |
| Monitor                   | ✅ Prometheus integration         | ❌ Limited                    |
| Web Terminal              | ✅ Pod and node shell access      | ✅ Pod only                   |
| Global Search             | ✅ Across all resources           | ❌ Limited                    |
| Image Tag Selection       | ✅ Automatic registry integration | ❌ Not available              |

## Getting Started

Ready to explore Kite? Check out the [installation guide](./installation).
