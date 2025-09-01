import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Kite",
  description: "A modern, intuitive Kubernetes dashboard",

  sitemap: {
    hostname: "https://kite.zzde.me",
    lastmodDateOnly: false,
  },

  markdown: {
    image: {
      lazyLoading: true,
    },
  },

  lastUpdated: true,
  locales: {
    root: {
      label: "English",
      lang: "en",
    },
    zh: {
      label: "中文",
      lang: "zh-CN",
      link: "/zh/",
      title: "Kite",
      description: "一个现代的、直观的 Kubernetes 仪表盘",
      themeConfig: {
        nav: [
          { text: "首页", link: "/zh/" },
          { text: "指南", link: "/zh/guide/" },
          { text: "配置", link: "/zh/config/" },
          { text: "常见问题", link: "/zh/faq" },
        ],
        editLink: {
          pattern: "https://github.com/zxh326/kite/tree/main/docs/:path",
          text: "在 GitHub 上编辑此页面",
        },
      },
    },
  },

  head: [
    ["link", { rel: "icon", href: "/logo.svg" }],
    [
      "script",
      {
        src: "https://cloud.umami.is/script.js",
        "data-website-id": "764af8e4-8fa4-4fc5-83e2-304718cc15fe",
        defer: "true",
      },
    ],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.svg",
    search: {
      provider: 'local'
    },
    langMenuLabel: "Language",
    editLink: {
      pattern: "https://github.com/zxh326/kite/tree/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Configuration", link: "/config/" },
      { text: "FAQ", link: "/faq" },
    ],

    sidebar: {
      "/": [
        {
          text: "Introduction",
          items: [
            { text: "What is Kite?", link: "/guide/" },
            { text: "Getting Started", link: "/guide/installation" },
          ],
        },
        {
          text: "Configuration",
          items: [
            { text: "User Management", link: "/config/user-management" },
            { text: "OAuth Setup", link: "/config/oauth-setup" },
            { text: "RBAC Configuration", link: "/config/rbac-config" },
            { text: "Prometheus Setup", link: "/config/prometheus-setup" },
            { text: "Environment Variables", link: "/config/env" },
            { text: "Chart Values", link: "/config/chart-values" },
          ],
        },
        {
          text: "Usage",
          items: [
            { text: "Global Search", link: "/guide/global-search" },
            { text: "Related Resources", link: "/guide/related-resources" },
            { text: "Logs", link: "/guide/logs" },
            { text: "Monitor", link: "/guide/monitoring" },
            { text: "Web Terminal", link: "/guide/web-terminal" },
            { text: "Resource History", link: "/guide/resource-history" },
          ],
        },
        {
          text: "FAQ",
          link: "/faq",
        },
      ],
      "/zh/": [
        {
          text: "介绍",
          items: [
            { text: "什么是 Kite?", link: "/zh/guide/" },
            { text: "开始", link: "/zh/guide/installation" },
          ],
        },
        {
          text: "配置",
          items: [
            { text: "用户管理", link: "/zh/config/user-management" },
            { text: "OAuth 设置", link: "/zh/config/oauth-setup" },
            { text: "RBAC 配置", link: "/zh/config/rbac-config" },
            { text: "Prometheus 设置", link: "/zh/config/prometheus-setup" },
            { text: "环境变量", link: "/zh/config/env" },
            { text: "Chart Values", link: "/zh/config/chart-values" },
          ],
        },
        {
          text: "使用指南",
          items: [
            { text: "全局搜索", link: "/zh/guide/global-search" },
            { text: "相关资源", link: "/zh/guide/related-resources" },
            { text: "日志", link: "/zh/guide/logs" },
            { text: "监控", link: "/zh/guide/monitoring" },
            { text: "Web 终端", link: "/zh/guide/web-terminal" },
            { text: "资源历史", link: "/zh/guide/resource-history" },
          ],
        },
        {
          text: "常见问题",
          link: "/zh/faq",
        }
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/zxh326/kite" }],

    footer: {
      message: "Released under the Apache License.",
      copyright: "Copyright © 2025-present Kite Contributors",
    },
  },
});
