package auth

import (
	"net/http"
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
	providers := []string{}
	if common.OAuthEnabled {
		providers = h.manager.GetAvailableProviders()
	}
	if common.PasswordLoginEnabled {
		providers = append(providers, "password")
	}
	c.JSON(http.StatusOK, gin.H{
		"providers": providers,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	provider := c.Query("provider")
	if provider == "" {
		provider = "github" // Default to GitHub for backward compatibility
	}

	oauthProvider, err := h.manager.GetProvider(provider)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Provider not supported: " + provider,
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

	// Create user object
	cuser := &common.User{
		Username: user.Username,
		Name:     user.Name,
		Provider: "password",
	}

	jwtToken, err := h.manager.GenerateJWT(cuser, "")
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
		provider = "github" // Default to GitHub for backward compatibility
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
	oauthProvider, err := h.manager.GetProvider(provider)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Provider not found: " + provider,
		})
		return
	}

	// Exchange code for token
	tokenResp, err := oauthProvider.ExchangeCodeForToken(code)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=token_exchange_failed&reason=token_exchange_failed&provider="+provider)
		return
	}

	// Get user info
	user, err := oauthProvider.GetUserInfo(tokenResp.AccessToken)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=user_info_failed&reason=user_info_failed&provider="+provider)
		return
	}

	role := rbac.GetUserRoles(*user)
	if len(role) == 0 {
		klog.Warningf("OAuth Callback - Access denied for user: %s (provider: %s, name: %s)", user.Username, provider, user.Name)
		c.Redirect(http.StatusFound, "/login?error=insufficient_permissions&reason=insufficient_permissions&user="+user.Username+"&provider="+provider)
		return
	}

	// Generate JWT with refresh token support
	jwtToken, err := h.manager.GenerateJWT(user, tokenResp.RefreshToken)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=jwt_generation_failed&reason=jwt_generation_failed&user="+user.Username+"&provider="+provider)
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

var (
	AnonymousUser = common.User{
		ID:        "anonymous",
		Username:  "anonymous",
		Name:      "Anonymous",
		AvatarURL: "",
		Provider:  "none",
	}
)

func (h *AuthHandler) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		if !common.OAuthEnabled && !common.PasswordLoginEnabled {
			anonymous := AnonymousUser
			anonymous.Roles = rbac.GetUserRoles(anonymous)
			c.Set("user", anonymous)
			c.Next()
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
			refreshedToken, refreshErr := h.manager.RefreshJWT(tokenString)
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

		u := common.User{
			ID:         claims.UserID,
			Username:   claims.Username,
			Name:       claims.Name,
			AvatarURL:  claims.AvatarURL,
			Provider:   claims.Provider,
			OIDCGroups: claims.OIDCGroups,
		}
		u.Roles = rbac.GetUserRoles(u)
		c.Set("user", u)
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
	newToken, err := h.manager.RefreshJWT(tokenString)
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
