# What is Kite?

Kite is a lightweight, modern Kubernetes dashboard that provides an intuitive interface for managing and monitoring Kubernetes clusters. It offers real-time metrics, comprehensive resource management, multi-cluster support, and a beautiful user experience.

![Dashboard Overview](/screenshots/overview.png)

## ✨ Features

### 🎯 **Modern User Experience**

- 🌓 **Multi-Theme Support** - Dark/light/color themes with system preference detection
- 🔍 **Advanced Search** - Global search across all resources
- 🌐 **Internationalization** - Support for English and Chinese languages
- 📱 **Responsive Design** - Optimized for desktop, tablet, and mobile devices

### 🏘️ **Multi-Cluster Management**

- 🔄 **Seamless Cluster Switching** - Switch between multiple Kubernetes clusters
- 📊 **Per-Cluster Monitoring** - Independent Prometheus configuration for each cluster
- ⚙️ **Kubeconfig Integration** - Automatic discovery of clusters from your kubeconfig file
- 🔐 **Cluster Access Control** - Fine-grained permissions for cluster access management

### 🔍 **Comprehensive Resource Management**

- 📋 **Full Resource Coverage** - Pods, Deployments, Services, ConfigMaps, Secrets, PVs, PVCs, Nodes, and more
- 📄 **Live YAML Editing** - Built-in Monaco editor with syntax highlighting and validation
- 📊 **Detailed Resource Views** - In-depth information with containers, volumes, events, and conditions
- 🔗 **Resource Relationships** - Visualize connections between related resources (e.g., Deployment → Pods)
- ⚙️ **Resource Operations** - Create, update, delete, scale, and restart resources directly from the UI
- 🔄 **Custom Resources** - Full support for CRDs (Custom Resource Definitions)
- 🏷️ **Quick Image Tag Selector** - Easily select and change container image tags based on Docker and container registry APIs
- 🎨 **Customizable Sidebar** - Customize sidebar visibility and order, and add CRDs for quick access
- 🔌 **Kube Proxy** - Access pods or services directly through Kite, no more `kubectl port-forward`

### 📈 **Monitoring & Observability**

- 📊 **Real-time Metrics** - CPU, memory, and network usage charts powered by Prometheus
- 📋 **Cluster Overview** - Comprehensive cluster health and resource statistics
- 📝 **Live Logs** - Stream pod logs in real-time with filtering and search capabilities
- 💻 **Web/Node Terminal** - Execute commands directly in pods/nodes through the browser
- 📈 **Node Monitoring** - Detailed node-level performance metrics and utilization
- 📊 **Pod Monitoring** - Individual pod resource usage and performance tracking

### 🔐 **Security**

- 🛡️ **OAuth Integration** - Supports OAuth management in the UI
- 🔒 **Role-Based Access Control** - Supports user permission management in the UI
- 👥 **User Management** - Comprehensive user management and role allocation in the UI

## Getting Started

Ready to explore Kite? Check out the [installation guide](./installation).
