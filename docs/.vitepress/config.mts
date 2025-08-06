import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Kite",
  description: "A modern, intuitive Kubernetes dashboard",

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
    langMenuLabel: "Language",
    editLink: {
      pattern: "https://github.com/zxh326/kite/tree/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Configuration", link: "/config/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "What is Kite?", link: "/guide/" },
            { text: "Getting Started", link: "/guide/installation" },
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
          ],
        },
        {
          text: "Configuration",
          link: "/config/",
        },
      ],
      "/config/": [
        {
          text: "Configuration",
          items: [
            { text: "OAuth Setup", link: "/config/oauth-setup" },
            { text: "RBAC Configuration", link: "/config/rbac-config" },
            { text: "Prometheus Setup", link: "/config/prometheus-setup" },
            { text: "Multi-Cluster Setup", link: "/config/multi-cluster" },
            { text: "Chart Values", link: "/config/chart-values" },
          ],
        },
      ],
      "/zh/guide/": [
        {
          text: "介绍",
          items: [
            { text: "什么是 Kite?", link: "/zh/guide/" },
            { text: "开始", link: "/zh/guide/installation" },
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
          ],
        },
        {
          text: "配置",
          link: "/zh/config/",
        },
      ],
      "/zh/config/": [
        {
          text: "配置",
          items: [
            { text: "OAuth 设置", link: "/zh/config/oauth-setup" },
            { text: "RBAC 配置", link: "/zh/config/rbac-config" },
            { text: "Prometheus 设置", link: "/zh/config/prometheus-setup" },
            { text: "多集群设置", link: "/zh/config/multi-cluster" },
            { text: "Chart Values", link: "/zh/config/chart-values" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/zxh326/kite" }],

    footer: {
      message: "Released under the Apache License.",
      copyright: "Copyright © 2025-present Kite Contributors",
    },
  },
});
