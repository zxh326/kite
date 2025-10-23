#!/bin/bash

set -e

NAMESPACE="${NAMESPACE:-kube-system}"
SA_NAME="${SA_NAME:-kite-admin}"
SECRET_NAME="${SECRET_NAME:-${SA_NAME}-token}"
OUTPUT_FILE="${OUTPUT_FILE:-kite-kubeconfig.yaml}"

cleanup() {
    echo "======================================"
    echo "Kite Resources Cleanup"
    echo "======================================"
    echo ""
    echo "This will delete the following resources:"
    echo "  - ClusterRoleBinding: $SA_NAME"
    echo "  - Secret: $SECRET_NAME (namespace: $NAMESPACE)"
    echo "  - ServiceAccount: $SA_NAME (namespace: $NAMESPACE)"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi

    echo ""
    echo "Deleting ClusterRoleBinding..."
    kubectl delete clusterrolebinding "$SA_NAME" --ignore-not-found=true

    echo "Deleting Secret..."
    kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found=true

    echo "Deleting ServiceAccount..."
    kubectl delete sa "$SA_NAME" -n "$NAMESPACE" --ignore-not-found=true

    echo ""
    echo "======================================"
    echo "✅ Cleanup completed!"
    echo "======================================"
    echo ""
}

create() {
    echo "======================================"
    echo "Kite Kubeconfig Generator"
    echo "======================================"
    echo ""
    echo "This script creates a Service Account and generates a kubeconfig"
    echo "that can be used with Kite (no exec plugins required)."
    echo ""
    echo "Configuration:"
    echo "  Namespace:    $NAMESPACE"
    echo "  SA Name:      $SA_NAME"
    echo "  Secret Name:  $SECRET_NAME"
    echo "  Output File:  $OUTPUT_FILE"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi

echo ""
echo "Step 1: Creating Service Account..."
kubectl create sa "$SA_NAME" -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Step 2: Creating ClusterRoleBinding..."
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: $SA_NAME
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: $SA_NAME
  namespace: $NAMESPACE
EOF

echo "Step 3: Creating Long-lived Token Secret..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: $SECRET_NAME
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/service-account.name: $SA_NAME
type: kubernetes.io/service-account-token
EOF

echo "Step 4: Waiting for token to be populated..."
for i in {1..30}; do
    if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.token}' 2>/dev/null | grep -q .; then
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Error: Token was not populated in secret after 30 seconds"
        exit 1
    fi
    sleep 1
done

echo "Step 5: Extracting credentials..."
TOKEN=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.token}' | base64 -d)
CA_CERT=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.ca\.crt}')
API_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')

if [ -z "$API_SERVER" ]; then
    echo "Error: Could not determine API server URL from current context"
    exit 1
fi

echo "Step 6: Generating kubeconfig..."
cat > "$OUTPUT_FILE" <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ${CA_CERT}
    server: ${API_SERVER}
  name: ${CLUSTER_NAME}
contexts:
- context:
    cluster: ${CLUSTER_NAME}
    user: ${SA_NAME}
  name: ${SA_NAME}@${CLUSTER_NAME}
current-context: ${SA_NAME}@${CLUSTER_NAME}
users:
- name: ${SA_NAME}
  user:
    token: ${TOKEN}
EOF

echo ""
echo "======================================"
echo "✅ Success!"
echo "======================================"
echo ""
echo "Kubeconfig has been saved to: $OUTPUT_FILE"
echo ""
echo "You can now use this file to add the cluster to Kite:"
echo "  1. Copy the contents of $OUTPUT_FILE"
echo "  2. Go to Kite UI -> Settings -> Clusters -> Add Cluster"
echo "  3. Paste the kubeconfig content"
echo ""
echo "To test the kubeconfig:"
echo "  kubectl --kubeconfig=$OUTPUT_FILE get nodes"
echo ""
}

show_usage() {
    cat <<EOF
Usage: $0 [COMMAND]

Commands:
  create    Create Service Account and generate kubeconfig (default)
  cleanup   Delete all created resources (SA, Secret, ClusterRoleBinding)
  help      Show this help message

Environment Variables:
  NAMESPACE     Kubernetes namespace (default: kube-system)
  SA_NAME       Service Account name (default: kite-admin)
  SECRET_NAME   Secret name (default: kite-admin-token)
  OUTPUT_FILE   Output kubeconfig file (default: kite-kubeconfig.yaml)

Examples:
  # Create resources with defaults
  $0 create

  # Create with custom namespace
  NAMESPACE=my-namespace $0 create

  # Cleanup resources
  $0 cleanup

  # Cleanup with custom names
  SA_NAME=my-sa NAMESPACE=my-namespace $0 cleanup

EOF
}

COMMAND="${1:-create}"

case "$COMMAND" in
    create)
        create
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo "Error: Unknown command '$COMMAND'"
        echo ""
        show_usage
        exit 1
        ;;
esac
