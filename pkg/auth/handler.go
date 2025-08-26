package auth

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/model"
	"github.com/zxh326/kite/pkg/rbac"
	"k8s.io/klog/v2"
)

type AuthHandler struct {
	manager *OAuthManager
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		manager: NewOAuthManager(),
	}
}

func (h *AuthHandler) GetProviders(c *gin.Context) {
	providers := h.manager.GetAvailableProviders()
	providers = append(providers, "password")
	c.JSON(http.StatusOK, gin.H{
		"providers": providers,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	provider := c.Query("provider")
	if provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Provider parameter is required",
		})
		return
	}

	oauthProvider, err := h.manager.GetProvider(c, provider)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	state := h.manager.GenerateState()

	klog.V(1).Infof("OAuth Login - Provider: %s, State: %s", provider, state)

	// Store state and provider in cookies with better settings
	// Using SameSite=Lax to allow cross-site requests during OAuth flow
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("oauth_state", state, 600, "/", "", false, true)
	c.SetCookie("oauth_provider", provider, 600, "/", "", false, true)

	authURL := oauthProvider.GetAuthURL(state)
	c.JSON(http.StatusOK, gin.H{
		"auth_url": authURL,
		"provider": provider,
	})
}

func (h *AuthHandler) PasswordLogin(c *gin.Context) {
	var req common.PasswordLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	user, err := model.GetUserByUsername(req.Username)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if !model.CheckPassword(user.Password, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if !user.Enabled {
		c.JSON(http.StatusForbidden, gin.H{"error": "user disabled"})
		return
	}

	if err := model.LoginUser(user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed login"})
		return
	}

	jwtToken, err := h.manager.GenerateJWT(user, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate JWT"})
		return
	}

	c.SetCookie("auth_token", jwtToken, common.JWTExpirationSeconds, "/", "", false, true)

	c.Status(http.StatusNoContent)
}

func (h *AuthHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	// Get provider from cookie
	provider, err := c.Cookie("oauth_provider")
	if err != nil {
		klog.Error("OAuth Callback - No provider found in cookie: ", err)
		c.Redirect(http.StatusFound, "/login?error=missing_provider&reason=no_provider_in_cookie")
		return
	}

	klog.V(1).Infof("OAuth Callback - Using provider: %s\n", provider)

	// Clear cookies
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)
	c.SetCookie("oauth_provider", "", -1, "/", "", false, true)

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Authorization code not provided",
		})
		return
	}

	// Get the OAuth provider
	oauthProvider, err := h.manager.GetProvider(c, provider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Provider not found: " + provider,
		})
		return
	}

	klog.V(1).Infof("OAuth Callback - Exchanging code for token with provider: %s", provider)
	// Exchange code for token
	tokenResp, err := oauthProvider.ExchangeCodeForToken(code)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=token_exchange_failed&reason=token_exchange_failed&provider="+provider)
		return
	}

	klog.V(1).Infof("OAuth Callback - Getting user info with provider: %s", provider)
	// Get user info
	user, err := oauthProvider.GetUserInfo(tokenResp.AccessToken)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=user_info_failed&reason=user_info_failed&provider="+provider)
		return
	}

	if err := model.FindWithSubOrUpsertUser(user); err != nil {
		c.Redirect(http.StatusFound, "/login?error=user_upsert_failed&reason=user_upsert_failed&provider="+provider)
		return
	}
	role := rbac.GetUserRoles(*user)
	if len(role) == 0 {
		klog.Warningf("OAuth Callback - Access denied for user: %s (provider: %s)", user.Key(), provider)
		c.Redirect(http.StatusFound, "/login?error=insufficient_permissions&reason=insufficient_permissions&user="+user.Key()+"&provider="+provider)
		return
	}
	if !user.Enabled {
		c.Redirect(http.StatusFound, "/login?error=user_disabled&reason=user_disabled")
		return
	}

	// Generate JWT with refresh token support
	jwtToken, err := h.manager.GenerateJWT(user, tokenResp.RefreshToken)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=jwt_generation_failed&reason=jwt_generation_failed&user="+user.Key()+"&provider="+provider)
		return
	}

	// Set JWT as HTTP-only cookie
	c.SetCookie("auth_token", jwtToken, common.JWTExpirationSeconds, "/", "", false, true)

	c.Redirect(http.StatusFound, "/dashboard")
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetCookie("auth_token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) GetUser(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Not authenticated",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

func (h *AuthHandler) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		if common.AnonymousUserEnabled {
			c.Set("user", model.AnonymousUser)
			return
		}

		// Try to get token from cookie first
		if cookie, err := c.Cookie("auth_token"); err == nil {
			tokenString = cookie
		} else {
			// Fallback to Authorization header
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "No authorization token provided",
				})
				c.Abort()
				return
			}

			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = authHeader[7:]
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid authorization header format",
				})
				c.Abort()
				return
			}
		}

		// Validate and potentially refresh the token
		claims, err := h.manager.ValidateJWT(tokenString)
		if err != nil {
			// Try to refresh the token if validation fails
			refreshedToken, refreshErr := h.manager.RefreshJWT(c, tokenString)
			if refreshErr != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid or expired token",
				})
				c.Abort()
				return
			}

			// Update the cookie with refreshed token
			c.SetCookie("auth_token", refreshedToken, common.JWTExpirationSeconds, "/", "", false, true)

			// Validate the refreshed token
			claims, err = h.manager.ValidateJWT(refreshedToken)
			if err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Failed to validate refreshed token",
				})
				c.Abort()
				return
			}
		}
		user, err := model.GetUserByID(claims.UserID)
		if err != nil || !user.Enabled {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "user not found",
			})
			c.SetCookie("auth_token", "", -1, "/", "", false, true)
			c.Abort()
			return
		}
		user.Roles = rbac.GetUserRoles(*user)
		c.Set("user", *user)
		c.Next()
	}
}

func (h *AuthHandler) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Not authenticated",
			})
			c.Abort()
			return
		}

		u := user.(model.User)
		if !rbac.UserHasRole(u, model.DefaultAdminRole.Name) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin role required",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Get token from cookie
	tokenString, err := c.Cookie("auth_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "No token found",
		})
		return
	}

	// Refresh the token
	newToken, err := h.manager.RefreshJWT(c, tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Failed to refresh token",
		})
		return
	}

	// Update the cookie with the new token
	c.SetCookie("auth_token", newToken, common.JWTExpirationSeconds, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Token refreshed successfully",
	})
}

// OAuth Provider Management APIs

func (h *AuthHandler) ListOAuthProviders(c *gin.Context) {
	providers, err := model.GetAllOAuthProviders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve OAuth providers",
		})
		return
	}

	// Don't expose client secrets in the response
	for i := range providers {
		providers[i].ClientSecret = "***"
	}

	c.JSON(http.StatusOK, gin.H{
		"providers": providers,
	})
}

func (h *AuthHandler) CreateOAuthProvider(c *gin.Context) {
	var provider model.OAuthProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request payload: " + err.Error(),
		})
		return
	}

	// Validate required fields
	if provider.Name == "" || provider.ClientID == "" || string(provider.ClientSecret) == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Name, ClientID, and ClientSecret are required",
		})
		return
	}

	if err := model.CreateOAuthProvider(&provider); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create OAuth provider: " + err.Error(),
		})
		return
	}

	// Note: Providers are now loaded dynamically from database, no reload needed

	// Don't expose client secret in response
	provider.ClientSecret = "***"
	c.JSON(http.StatusCreated, gin.H{
		"provider": provider,
	})
}

func (h *AuthHandler) UpdateOAuthProvider(c *gin.Context) {
	id := c.Param("id")
	var provider model.OAuthProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request payload: " + err.Error(),
		})
		return
	}

	// Parse ID and set it
	dbID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid provider ID",
		})
		return
	}
	provider.ID = uint(dbID)

	// Validate required fields
	if provider.Name == "" || provider.ClientID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Name and ClientID are required",
		})
		return
	}

	updates := map[string]interface{}{
		"name":          provider.Name,
		"client_id":     provider.ClientID,
		"auth_url":      provider.AuthURL,
		"token_url":     provider.TokenURL,
		"user_info_url": provider.UserInfoURL,
		"scopes":        provider.Scopes,
		"issuer":        provider.Issuer,
		"enabled":       provider.Enabled,
	}
	if provider.ClientSecret != "" {
		updates["client_secret"] = provider.ClientSecret
	}

	if err := model.UpdateOAuthProvider(&provider, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update OAuth provider: " + err.Error(),
		})
		return
	}
	// Don't expose client secret in response
	provider.ClientSecret = "***"
	c.JSON(http.StatusOK, gin.H{
		"provider": provider,
	})
}

func (h *AuthHandler) DeleteOAuthProvider(c *gin.Context) {
	id := c.Param("id")
	dbID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid provider ID",
		})
		return
	}

	if err := model.DeleteOAuthProvider(uint(dbID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete OAuth provider: " + err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "OAuth provider deleted successfully",
	})
}

func (h *AuthHandler) GetOAuthProvider(c *gin.Context) {
	id := c.Param("id")
	dbID, err := strconv.ParseUint(id, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid provider ID",
		})
		return
	}

	var provider model.OAuthProvider
	if err := model.DB.First(&provider, uint(dbID)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "OAuth provider not found",
		})
		return
	}

	provider.ClientSecret = "***"
	c.JSON(http.StatusOK, gin.H{
		"provider": provider,
	})
}
