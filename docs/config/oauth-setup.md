# OAuth Setup Guide

This guide explains how to configure OAuth authentication for Kite, with support for multiple authentication providers.

## Overview

Kite supports multiple OAuth providers through a flexible configuration system:

- **Built-in providers**: GitHub
- **Custom providers**: Any OAuth2-compatible provider (GitLab, Bitbucket, Auth0, Azure AD, Discord, Slack, etc.)

## Permissions

By default, even after a successful login, Kite does not grant any permissions to the user. You need to manually configure RBAC rules to grant access.

See the [RBAC Configuration Guide](./rbac-config) for details.

## Built-in Providers

### GitHub OAuth

1. **Create a GitHub OAuth App**:

   - Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
   - Fill in the application details:
     - **Application name**: `Kite Kubernetes Dashboard`
     - **Homepage URL**: `http://localhost:8080` (adjust according to your deployment)
     - **Authorization callback URL**: `http://localhost:8080/api/auth/callback` (adjust according to your deployment)

2. **Configure Environment Variables**:

   ```sh
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

3. **Using Helm**:

   ```yaml
   # values.yaml
   oauth:
     enabled: true
     redirect: "http://${HOST}/api/auth/callback"
     providers:
       github:
         clientID: "your_github_client_id"
         clientSecret: "your_github_client_secret"
   ```

## Custom OAuth Providers

### Adding a Custom Provider

1. **Using Env**:

   ```sh
   OAUTH_PROVIDERS=<PROVIDER1>,<PROVIDER2>  # e.g., github,gitlab
   OAUTH_REDIRECT=http://localhost:8080/api/auth/callback
   OAUTH_ENABLED=true
   # Replace <PROVIDER> with the name of your chosen OAuth provider, in uppercase
   PROVIDER_CLIENT_ID=your_client_id
   PROVIDER_CLIENT_SECRET=your_client_secret
   # PROVIDER_SCOPES=scope1,scope2   # Optional, defaults to openid,profile,email
   # PROVIDER_AUTH_URL=...           # Optional, auto-discovered if not set
   # PROVIDER_TOKEN_URL=...          # Optional, auto-discovered if not set
   # PROVIDER_USERINFO_URL=...       # Optional, auto-discovered if not set
   # PROVIDER_ISSUER=...             # Optional, used for .well-known discovery
   ```

2. **Using Helm**:

   ```yaml
   # values.yaml
   oauth:
     enabled: true
     redirect: "http://${HOST}/api/auth/callback"
     providers:
       <PROVIDER>:
         clientID: "your_github_client_id"
         clientSecret: "your_github_client_secret"
         authURL: "https://<provider>/oauth/authorize" # Optional
         tokenURL: "https://<provider>/oauth/token" # Optional
         userinfoURL: "https://<provider>/oauth/userinfo" # Optional
         scopes: "openid,profile,email" # Optional, defaults to openid,profile,
         issuer: "https://<provider>" # Optional, for auto-discovery
   ```

### OpenID Connect Auto-Discovery

- If `PROVIDER_AUTH_URL`, `PROVIDER_TOKEN_URL`, or `PROVIDER_USERINFO_URL` are not set, Kite will automatically discover them using the provider's `.well-known/openid-configuration` endpoint (OpenID Connect Auto-Discovery).
- You can set `PROVIDER_ISSUER` to explicitly specify the issuer base URL for auto-discovery.

### Default Scopes

- If `PROVIDER_SCOPES` is not set, Kite will default to `openid,profile,email`.

### Auth0 OAuth

1. **Create Auth0 Application**:

   - Go to [Auth0 Dashboard](https://manage.auth0.com/)
   - Create a new "Regular Web Application"
   - Set allowed callback URLs: `http://localhost:8080/api/auth/callback`

2. **Configure environment variables**:

   ```sh
   OAUTH_PROVIDERS=auth0
   AUTH0_CLIENT_ID=your_auth0_client_id
   AUTH0_CLIENT_SECRET=your_auth0_client_secret
   AUTH0_REDIRECT_URL=http://localhost:8080/api/auth/callback
   AUTH0_ISSUER=https://your-tenant.auth0.com
   ```

### Azure AD OAuth

1. **Register Azure AD Application**:

   - Go to [Azure Portal > App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   - Create a new registration
   - Set redirect URI: `http://localhost:8080/api/auth/callback`

2. **Configure environment variables**:

   ```sh
   OAUTH_PROVIDERS=azure
   AZURE_CLIENT_ID=your_azure_client_id
   AZURE_CLIENT_SECRET=your_azure_client_secret
   AZURE_REDIRECT_URL=http://localhost:8080/api/auth/callback
   AZURE_ISSUER=https://login.microsoftonline.com/{tenant-id}/v2.0
   ```

## Security Considerations

- Always use HTTPS in production environments
- Keep client secrets secure
- Configure proper RBAC to restrict access after authentication
- Regularly review authorized users and permissions
