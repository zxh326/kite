# OAuth 设置指南

本指南介绍如何为 Kite 配置 OAuth 认证，支持多种认证提供商。

## 概述

Kite 通过灵活的配置系统支持多种 OAuth 提供商：

- **内置提供商**：GitHub
- **自定义提供商**：任何兼容 OAuth2 的提供商（GitLab、Bitbucket、Auth0、Azure AD、Discord、Slack 等）

## 权限

默认情况下，即使登录成功，Kite 也不会授予用户任何权限。您需要手动配置 RBAC 规则来授予访问权限。

查看 [RBAC 配置指南](./rbac-config) 获取详情。

## 内置提供商

### GitHub OAuth

1. **创建 GitHub OAuth 应用**：

   - 前往 [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
   - 填写应用程序详情：
     - **应用名称**：`Kite Kubernetes Dashboard`
     - **主页 URL**：`http://localhost:8080`（根据您的部署调整）
     - **授权回调 URL**：`http://localhost:8080/api/auth/callback`（根据您的部署调整）

2. **配置环境变量**：

   ```sh
   GITHUB_CLIENT_ID=您的_github_client_id
   GITHUB_CLIENT_SECRET=您的_github_client_secret
   ```

3. **使用 Helm**：

   ```yaml
   # values.yaml
   oauth:
     enabled: false
     redirect: "http://${HOST}/api/auth/callback"
     providers:
       github:
         clientID: "您的_github_client_id"
         clientSecret: "您的_github_client_secret"
   ```

## 自定义 OAuth 提供商

### 添加自定义提供商

1. **使用 Env**：

   ```sh
   OAUTH_PROVIDERS=<PROVIDER1>,<PROVIDER2>  # 例如 github,gitlab
   OAUTH_REDIRECT=http://localhost:8080/api/auth/callback
   OAUTH_ENABLED=true
   # 将 <PROVIDER> 替换为您选择的 OAuth 提供商名称，大写
   PROVIDER_CLIENT_ID=您的_client_id
   PROVIDER_CLIENT_SECRET=您的_client_secret
   # PROVIDER_SCOPES=scope1,scope2   # 可选，默认为 openid,profile,email
   # PROVIDER_AUTH_URL=...           # 可选，如未设置则自动发现
   # PROVIDER_TOKEN_URL=...          # 可选，如未设置则自动发现
   # PROVIDER_USERINFO_URL=...       # 可选，如未设置则自动发现
   # PROVIDER_ISSUER=...             # 可选，用于 .well-known 发现
   ```

2. **使用 Helm**：

   ```yaml
   # values.yaml
   oauth:
     enabled: false
     redirect: "http://${HOST}/api/auth/callback"
     providers:
       <PROVIDER>:
         clientID: "您的_github_client_id"
         clientSecret: "您的_github_client_secret"
         authURL: "https://<provider>/oauth/authorize" # 可选
         tokenURL: "https://<provider>/oauth/token" # 可选
         userinfoURL: "https://<provider>/oauth/userinfo" # 可选
         scopes: "openid,profile,email" # 可选，默认为 openid,profile,
         issuer: "https://<provider>" # 可选，用于自动发现
   ```

### OpenID Connect 自动发现

- 如果未设置 `PROVIDER_AUTH_URL`、`PROVIDER_TOKEN_URL` 或 `PROVIDER_USERINFO_URL`，Kite 将使用提供商的 `.well-known/openid-configuration` 端点（OpenID Connect 自动发现）自动发现它们。
- 您可以设置 `PROVIDER_ISSUER` 以明确指定用于自动发现的发行者基础 URL。

### 默认作用域

- 如果未设置 `PROVIDER_SCOPES`，Kite 将默认使用 `openid,profile,email`。
