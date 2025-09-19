// Kubernetes resource templates

export interface ResourceTemplate {
  name: string
  description: string
  yaml: string
}

export const resourceTemplates: ResourceTemplate[] = [
  {
    name: 'Pod',
    description: 'A basic Pod with a single container',
    yaml: `apiVersion: v1
kind: Pod
metadata:
  name: example-pod
  namespace: default
  labels:
    app: example
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"`,
  },
  {
    name: 'Deployment',
    description: 'A Deployment with 3 replicas',
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-deployment
  namespace: default
  labels:
    app: example
spec:
  replicas: 3
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"`,
  },
  {
    name: 'StatefulSet',
    description: 'A StatefulSet with persistent storage',
    yaml: `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: example-statefulset
  namespace: default
spec:
  serviceName: "example-service"
  replicas: 3
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi`,
  },
  {
    name: 'Job',
    description: 'A Job that runs a task to completion',
    yaml: `apiVersion: batch/v1
kind: Job
metadata:
  name: example-job
  namespace: default
spec:
  template:
    spec:
      containers:
      - name: busybox
        image: busybox:1.35
        command: ['sh', '-c']
        args:
        - |
          echo "Starting job..."
          sleep 30
          echo "Job completed successfully!"
        resources:
          requests:
            memory: "32Mi"
            cpu: "100m"
          limits:
            memory: "64Mi"
            cpu: "200m"
      restartPolicy: Never
  backoffLimit: 4`,
  },
  {
    name: 'CronJob',
    description: 'A CronJob that runs on a schedule',
    yaml: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: example-cronjob
  namespace: default
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: busybox
            image: busybox:1.35
            command: ['sh', '-c']
            args:
            - |
              echo "Running scheduled task..."
              date
              echo "Task completed!"
            resources:
              requests:
                memory: "32Mi"
                cpu: "100m"
              limits:
                memory: "64Mi"
                cpu: "200m"
          restartPolicy: OnFailure`,
  },
  {
    name: 'Service',
    description: 'A Service to expose applications',
    yaml: `apiVersion: v1
kind: Service
metadata:
  name: example-service
  namespace: default
  labels:
    app: example
spec:
  selector:
    app: example
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
  type: ClusterIP`,
  },
  {
    name: 'ConfigMap',
    description: 'A ConfigMap to store configuration data',
    yaml: `apiVersion: v1
kind: ConfigMap
metadata:
  name: example-configmap
  namespace: default
data:
  database_url: "postgresql://localhost:5432/mydb"
  debug: "true"
  max_connections: "100"
  config.yaml: |
    server:
      port: 8080
      host: 0.0.0.0
    logging:
      level: info`,
  },
  {
    name: 'Secret',
    description: 'A Secret to store sensitive data',
    yaml: `apiVersion: v1
kind: Secret
metadata:
  name: example-secret
  namespace: default
type: Opaque
data:
  username: YWRtaW4=  # base64 encoded "admin"
  password: MWYyZDFlMmU2N2Rm  # base64 encoded "1f2d1e2e67df"
stringData:
  database-url: "postgresql://user:pass@localhost:5432/mydb"`,
  },
  {
    name: 'Daemonset',
    description: 'A DaemonSet to run pods on all nodes',
    yaml: `apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: example-daemonset
spec:
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
    spec:
      containers:
        - name: busybox
          image: busybox:1.35
          args:
            - /bin/sh
            - -c
            - 'while true; do echo alive; sleep 60; done'
`,
  },
  {
    name: 'Ingress',
    description: 'An Ingress to route external traffic',
    yaml: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: example-service
                port:
                  number: 80
`,
  },
  {
    name: 'Namespace',
    description: 'A Namespace for resource isolation',
    yaml: `apiVersion: v1
kind: Namespace
metadata:
  name: example-namespace
`,
  },
]

export const getTemplateByName = (
  name: string
): ResourceTemplate | undefined => {
  return resourceTemplates.find((template) => template.name === name)
}

export const getTemplateNames = (): string[] => {
  return resourceTemplates.map((template) => template.name)
}
