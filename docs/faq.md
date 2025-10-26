# Frequently Asked Questions (FAQ)

## Data Sharing

By default, Kite does not collect any analytics data.

If you would like to help improve the product, you can set the environment variable `ENABLE_ANALYTICS` to `true`.

Kite will use umami to collect minimal anonymous usage data.

The source code can be found [here](https://github.com/zxh326/kite/blob/main/pkg/utils/utils.go#L10-L16).

## Permission Issues

If you encounter an error message like the following when accessing resources:

```txt
User admin does not have permission to get configmaps in namespace kite in cluster in-cluster
```

This means that user `admin` does not have permission to access `configmaps` resources in the `kite` namespace.

You need to refer to the [RBAC Configuration Guide](./config/rbac-config) to configure user permissions.

## Managed Kubernetes Cluster Connection Issues

If you're using a managed Kubernetes cluster (AKS, EKS, GKE, etc.) and encounter authentication errors when adding the cluster to Kite, this is usually because the default kubeconfig uses `exec` plugins that require CLI tools (like `kubelogin`, `aws`, or `gcloud`).

Kite runs as a server-side application and cannot execute these client-side authentication tools. Instead, you should use Service Account token-based authentication.

Please refer to the [Managed Kubernetes Cluster Configuration Guide](./config/managed-k8s-auth) for detailed instructions on creating and using Service Account tokens for authentication.

## SQLite with hostPath Storage

If you're using SQLite as the database and encountering an "out of memory" error when using `hostPath` for persistent storage:

```txt
panic: failed to connect database: unable to open database file: out of memory (14)
```

This issue is related to the pure Go SQLite driver used by Kite (to avoid CGO dependencies). The driver has limitations when accessing database files on certain storage backends.

**Solution**: Add SQLite connection options to improve compatibility with hostPath storage. In your Helm values, set:

```yaml
db:
  sqlite:
    options: "_journal_mode=WAL&_busy_timeout=5000"
```

These options enable Write-Ahead Logging (WAL) mode and increase the busy timeout, which resolves most hostPath compatibility issues.

**Recommended for Production**: For production deployments requiring persistent storage, use MySQL or PostgreSQL instead of SQLite. These databases are better suited for containerized environments and persistent storage scenarios.

For more details, see [Issue #204](https://github.com/zxh326/kite/issues/204).

## How to Change Font

By default, Kite provides three fonts: system default, `Maple Mono`, and `JetBrains Mono`.

If you want to use a different font, you need to build the project yourself.

Build kite with make and change the font in `./ui/src/index.css`:

```css
@font-face {
  font-family: "Maple Mono";
  font-style: normal;
  font-display: swap;
  font-weight: 400;
  src: url(https://cdn.jsdelivr.net/fontsource/fonts/maple-mono@latest/latin-400-normal.woff2)
      format("woff2"), url(https://cdn.jsdelivr.net/fontsource/fonts/maple-mono@latest/latin-400-normal.woff)
      format("woff");
}

body {
  font-family: "Maple Mono", var(--font-sans);
}
```

## How Can I Contribute to Kite?

We welcome contributions! You can:

- Report bugs and feature requests on [GitHub Issues](https://github.com/zxh326/kite/issues)
- Submit pull requests
- Improve documentation
- Share feedback and use cases

## Where Can I Get Help?

You can get support through:

- [GitHub Issues](https://github.com/zxh326/kite/issues) for bug reports and feature requests
- [Slack Community](https://join.slack.com/t/kite-dashboard/shared_invite/zt-3amy6f23n-~QZYoricIOAYtgLs_JagEw) for questions and community support

---

**Didn't find what you're looking for?** Feel free to [open an issue](https://github.com/zxh326/kite/issues/new) on GitHub or start a [discussion](https://github.com/zxh326/kite/discussions).
