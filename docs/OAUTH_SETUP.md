# OAuth Configuration Guide

This guide explains how to configure OAuth authentication for Kite Kubernetes Dashboard with support for multiple OAuth providers.

## Overview

Kite supports multiple OAuth providers through a flexible configuration system:

- **Built-in providers**: GitHub
- **Custom providers**: Any OAuth2-compatible provider (GitLab, Bitbucket, Auth0, Azure AD, Discord, Slack, etc.)

## Permissions

You need to set the `OAUTH_ALLOW_USERS` environment variable to limit access permissions. This variable should contain a list of usernames allowed to access, separated by commas.

```env
OAUTH_ALLOW_USERS=user1,user2,user3

# It can also be configured with *, allowing all users logging in via OAuth to access.
OAUTH_ALLOW_USERS=*
```

## Built-in Providers

### GitHub OAuth

1. **Create GitHub OAuth App**:

   - Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
   - Fill in the application details:
     - **Application name**: `Kite Kubernetes Dashboard`
     - **Homepage URL**: `http://localhost:8080`
     - **Authorization callback URL**: `http://localhost:8080/api/auth/callback`

2. **Configure environment variables**:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_REDIRECT_URL=http://localhost:8080/api/auth/callback
   ```

## Custom Providers

### Adding a Custom Provider

1. **Add provider to the list**:

   ```env
   OAUTH_PROVIDERS=gitlab,bitbucket,auth0
   ```

2. **Configure provider-specific variables** (replace `PROVIDER` with actual provider name in UPPERCASE):
   ```env
   PROVIDER_CLIENT_ID=your_client_id
   PROVIDER_CLIENT_SECRET=your_client_secret
   PROVIDER_REDIRECT_URL=http://localhost:8080/api/auth/callback
   PROVIDER_SCOPES=scope1,scope2
   PROVIDER_AUTH_URL=https://provider.com/oauth/authorize
   PROVIDER_TOKEN_URL=https://provider.com/oauth/token
   PROVIDER_USERINFO_URL=https://provider.com/api/user
   ```

### Example: GitLab OAuth

1. **Create GitLab Application**:

   - Go to [GitLab Settings > Applications](https://gitlab.com/-/profile/applications)
   - Set redirect URI: `http://localhost:8080/api/auth/callback`
   - Select scopes: `read_user`, `read_api`

2. **Configure environment variables**:
   ```env
   OAUTH_PROVIDERS=gitlab
   GITLAB_CLIENT_ID=your_gitlab_client_id
   GITLAB_CLIENT_SECRET=your_gitlab_client_secret
   GITLAB_REDIRECT_URL=http://localhost:8080/api/auth/callback
   GITLAB_SCOPES=read_user,read_api
   GITLAB_AUTH_URL=https://gitlab.com/oauth/authorize
   GITLAB_TOKEN_URL=https://gitlab.com/oauth/token
   GITLAB_USERINFO_URL=https://gitlab.com/api/v4/user
   ```

### Example: Auth0 OAuth

1. **Create Auth0 Application**:

   - Go to [Auth0 Dashboard](https://manage.auth0.com/)
   - Create a new "Single Page Application"
   - Set allowed callback URLs: `http://localhost:8080/api/auth/callback`

2. **Configure environment variables**:
   ```env
   OAUTH_PROVIDERS=auth0
   AUTH0_CLIENT_ID=your_auth0_client_id
   AUTH0_CLIENT_SECRET=your_auth0_client_secret
   AUTH0_REDIRECT_URL=http://localhost:8080/api/auth/callback
   AUTH0_SCOPES=openid,profile
   AUTH0_AUTH_URL=https://YOUR_DOMAIN.auth0.com/authorize
   AUTH0_TOKEN_URL=https://YOUR_DOMAIN.auth0.com/oauth/token
   AUTH0_USERINFO_URL=https://YOUR_DOMAIN.auth0.com/userinfo
   ```

## Token Refresh

Kite automatically handles token refresh for providers that support it:

- **Automatic refresh**: Tokens are refreshed automatically when they expire
- **Background refresh**: Refresh happens every 30 minutes in the background
- **Retry logic**: Failed API requests due to expired tokens trigger automatic refresh

### Refresh Token Support by Provider

| Provider  | Refresh Token Support | Notes                      |
| --------- | --------------------- | -------------------------- |
| GitHub    | ❌                    | GitHub tokens don't expire |
| Google    | ✅                    | Supports refresh tokens    |
| GitLab    | ✅                    | Supports refresh tokens    |
| Auth0     | ✅                    | Supports refresh tokens    |
| Bitbucket | ❌                    | Limited refresh support    |
