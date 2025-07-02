package auth

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/zxh326/kite/pkg/common"
)

// OAuthProvider defines the interface for OAuth providers
type OAuthProvider interface {
	GetAuthURL(state string) string
	ExchangeCodeForToken(code string) (*TokenResponse, error)
	GetUserInfo(accessToken string) (*User, error)
	RefreshToken(refreshToken string) (*TokenResponse, error)
	GetProviderName() string
}

// OAuthConfig holds common OAuth configuration
type OAuthConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
}

// User represents a generic user from any OAuth provider
type User struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Provider  string `json:"provider"`
}

// TokenResponse represents OAuth token response with refresh token support
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in,omitempty"`
	Scope        string `json:"scope"`
}

// Claims represents JWT claims with refresh token support
type Claims struct {
	UserID       string `json:"user_id"`
	Username     string `json:"username"`
	Name         string `json:"name"`
	AvatarURL    string `json:"avatar_url"`
	Provider     string `json:"provider"`
	RefreshToken string `json:"refresh_token,omitempty"`
	jwt.RegisteredClaims
}

type GitHubProvider struct {
	Config OAuthConfig
}

func NewGitHubProvider() *GitHubProvider {
	ghp := &GitHubProvider{
		Config: OAuthConfig{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("OAUTH_REDIRECT"),
			Scopes:       []string{"openid", "profile", "email"},
		},
	}
	if ghp.Config.RedirectURL == "" {
		// for compatibility
		ghp.Config.RedirectURL = os.Getenv("GITHUB_REDIRECT_URL")
	}
	return ghp
}

func (g *GitHubProvider) GetProviderName() string {
	return "github"
}

func (g *GitHubProvider) GetAuthURL(state string) string {
	params := url.Values{}
	params.Add("client_id", g.Config.ClientID)
	params.Add("redirect_uri", g.Config.RedirectURL)
	params.Add("scope", strings.Join(g.Config.Scopes, " "))
	params.Add("state", state)
	params.Add("allow_signup", "true")

	return "https://github.com/login/oauth/authorize?" + params.Encode()
}

func (g *GitHubProvider) ExchangeCodeForToken(code string) (*TokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", g.Config.ClientID)
	data.Set("client_secret", g.Config.ClientSecret)
	data.Set("code", code)

	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func (g *GitHubProvider) RefreshToken(refreshToken string) (*TokenResponse, error) {
	// GitHub doesn't support refresh tokens in the traditional sense
	// Access tokens don't expire, but we can return an error to indicate this
	return nil, fmt.Errorf("github does not support token refresh")
}

func (g *GitHubProvider) GetUserInfo(accessToken string) (*User, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()

	var githubUser struct {
		ID        int    `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&githubUser); err != nil {
		return nil, err
	}

	return &User{
		ID:        fmt.Sprintf("%d", githubUser.ID),
		Username:  githubUser.Login,
		Name:      githubUser.Name,
		AvatarURL: githubUser.AvatarURL,
		Provider:  "github",
	}, nil
}

type GenericProvider struct {
	Config      OAuthConfig
	AuthURL     string
	TokenURL    string
	UserInfoURL string
	Name        string
}

func NewGenericProvider(name string) *GenericProvider {
	prefix := strings.ToUpper(name)
	// FIXME: get config from well-known endpoint
	gp := &GenericProvider{
		Config: OAuthConfig{
			ClientID:     os.Getenv(prefix + "_CLIENT_ID"),
			ClientSecret: os.Getenv(prefix + "_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("OAUTH_REDIRECT"),
			Scopes:       strings.Split(os.Getenv(prefix+"_SCOPES"), ","),
		},
		AuthURL:     os.Getenv(prefix + "_AUTH_URL"),
		TokenURL:    os.Getenv(prefix + "_TOKEN_URL"),
		UserInfoURL: os.Getenv(prefix + "_USERINFO_URL"),
		Name:        name,
	}
	if gp.Config.RedirectURL == "" {
		// for compatibility
		gp.Config.RedirectURL = os.Getenv(prefix + "_REDIRECT_URL")
	}
	return gp
}

func (g *GenericProvider) GetProviderName() string {
	return g.Name
}

func (g *GenericProvider) GetAuthURL(state string) string {
	params := url.Values{}
	params.Add("client_id", g.Config.ClientID)
	params.Add("redirect_uri", g.Config.RedirectURL)
	params.Add("scope", strings.Join(g.Config.Scopes, " "))
	params.Add("state", state)
	params.Add("response_type", "code")

	return g.AuthURL + "?" + params.Encode()
}

func (g *GenericProvider) ExchangeCodeForToken(code string) (*TokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", g.Config.ClientID)
	data.Set("client_secret", g.Config.ClientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", g.Config.RedirectURL)

	req, err := http.NewRequest("POST", g.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()
	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func (g *GenericProvider) RefreshToken(refreshToken string) (*TokenResponse, error) {
	data := url.Values{}
	data.Set("client_id", g.Config.ClientID)
	data.Set("client_secret", g.Config.ClientSecret)
	data.Set("refresh_token", refreshToken)
	data.Set("grant_type", "refresh_token")

	req, err := http.NewRequest("POST", g.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()
	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}

func (g *GenericProvider) GetUserInfo(accessToken string) (*User, error) {
	req, err := http.NewRequest("GET", g.UserInfoURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = resp.Body.Close()
	}()
	var userInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, err
	}

	// Map common fields - this might need customization per provider
	user := &User{
		Provider: g.Name,
	}

	if id, ok := userInfo["id"]; ok {
		user.ID = fmt.Sprintf("%v", id)
	}
	if username, ok := userInfo["username"]; ok {
		user.Username = fmt.Sprintf("%v", username)
	} else if login, ok := userInfo["login"]; ok {
		user.Username = fmt.Sprintf("%v", login)
	} else if email, ok := userInfo["email"]; ok {
		user.Username = fmt.Sprintf("%v", email)
	}
	if name, ok := userInfo["name"]; ok {
		user.Name = fmt.Sprintf("%v", name)
	}
	if avatar, ok := userInfo["avatar_url"]; ok {
		user.AvatarURL = fmt.Sprintf("%v", avatar)
	} else if picture, ok := userInfo["picture"]; ok {
		user.AvatarURL = fmt.Sprintf("%v", picture)
	}

	return user, nil
}

type OAuthManager struct {
	providers map[string]OAuthProvider
	jwtSecret string
}

func NewOAuthManager() *OAuthManager {
	manager := &OAuthManager{
		providers: make(map[string]OAuthProvider),
		jwtSecret: common.JwtSecret,
	}

	// Register providers based on environment variables
	if os.Getenv("GITHUB_CLIENT_ID") != "" {
		manager.providers["github"] = NewGitHubProvider()
	}

	// Register custom providers
	customProviders := strings.SplitSeq(common.OAuthProviders, ",")
	for providerName := range customProviders {
		providerName = strings.TrimSpace(providerName)
		if providerName != "" && providerName != "github" {
			provider := NewGenericProvider(providerName)
			if provider.Config.ClientID != "" {
				manager.providers[providerName] = provider
			}
		}
	}

	return manager
}

func (om *OAuthManager) GetProvider(name string) (OAuthProvider, error) {
	provider, exists := om.providers[name]
	if !exists {
		return nil, fmt.Errorf("provider %s not found", name)
	}
	return provider, nil
}

func (om *OAuthManager) GetAvailableProviders() []string {
	var providers []string
	for name := range om.providers {
		providers = append(providers, name)
	}
	return providers
}

func (om *OAuthManager) GenerateState() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func (om *OAuthManager) GenerateJWT(user *User, refreshToken string) (string, error) {
	now := time.Now()
	expirationTime := now.Add(common.JWTExpirationSeconds * time.Second)

	claims := Claims{
		UserID:       user.ID,
		Username:     user.Username,
		Name:         user.Name,
		AvatarURL:    user.AvatarURL,
		Provider:     user.Provider,
		RefreshToken: refreshToken,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "Kite",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(om.jwtSecret))
}

func (om *OAuthManager) ValidateJWT(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(om.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

func (om *OAuthManager) RefreshJWT(tokenString string) (string, error) {
	claims, err := om.ValidateJWT(tokenString)
	if err != nil {
		return "", err
	}

	// Check if token is close to expiration (within 1 hour)
	if time.Until(claims.ExpiresAt.Time) > time.Hour {
		return tokenString, nil // Token is still valid for more than 1 hour
	}

	// If we have a refresh token, try to refresh the OAuth token
	if claims.RefreshToken != "" {
		provider, err := om.GetProvider(claims.Provider)
		if err != nil {
			return "", err
		}

		tokenResp, err := provider.RefreshToken(claims.RefreshToken)
		if err != nil {
			return "", err
		}

		// Get updated user info with new access token
		user, err := provider.GetUserInfo(tokenResp.AccessToken)
		if err != nil {
			return "", err
		}

		// Generate new JWT with refreshed token
		newRefreshToken := tokenResp.RefreshToken
		if newRefreshToken == "" {
			newRefreshToken = claims.RefreshToken // Keep the old refresh token if no new one provided
		}

		return om.GenerateJWT(user, newRefreshToken)
	}

	// If no refresh token available, just generate a new JWT with existing claims
	// This is for providers like GitHub that don't expire tokens
	user := &User{
		ID:        claims.UserID,
		Username:  claims.Username,
		Name:      claims.Name,
		AvatarURL: claims.AvatarURL,
		Provider:  claims.Provider,
	}

	return om.GenerateJWT(user, "")
}

func CheckPermissions(user *User) bool {
	allowUsers := common.OAuthAllowUsers
	if allowUsers == "" {
		return false
	}
	if allowUsers == "*" {
		return true // Allow all users if wildcard is set
	}
	allowedUsers := strings.SplitSeq(allowUsers, ",")
	for allowedUser := range allowedUsers {
		allowedUser = strings.TrimSpace(allowedUser)
		if user.Username == allowedUser {
			return true
		}
		if user.Name == allowedUser {
			return true
		}
	}
	return false
}
