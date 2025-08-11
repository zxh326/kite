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

## How to Change Font

You need to build the project yourself.

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
