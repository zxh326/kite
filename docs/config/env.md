# Environment Variables

Kite supports several environment variables by default to change the default values of some configuration items.

- **KITE_USERNAME**: Set the initial administrator username. Can be created through the initialization page
- **KITE_PASSWORD**: Set the initial administrator password. Can be created through the initialization page
- **KUBECONFIG**: Kubernetes configuration file path, default value is `~/.kube/config`. When kite has no configured clusters, it will discover and import clusters from this path by default. Can import clusters through the initialization page
- **ANONYMOUS_USER_ENABLED**: Enable anonymous user access, default value is `false`. When enabled, all access will no longer require authentication and will have the highest permissions by default.

- **JWT_SECRET**: Secret key used for signing and verifying JWT
- **KITE_ENCRYPT_KEY**: Secret key used for encrypting sensitive data, such as user passwords, OAuth clientSecret, kubeconfig, etc.

- **HOST**: Used for generating OAuth 2.0 authorization callback addresses, default will be obtained from request headers. If you find the result not as expected, you can manually configure this environment variable.

- **NODE_TERMINAL_IMAGE**: Docker image used for generating Node Terminal Agent.

- **ENABLE_ANALYTICS**: Enable data analytics functionality, default value is `false`. When enabled, Kite will collect limited data to help improve the product.

- **PORT**: Port on which Kite runs, default value is `8080`.
