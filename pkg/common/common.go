package common

import (
	"os"
	"strings"

	"k8s.io/klog/v2"
)

const (
	JWTExpirationSeconds = 24 * 60 * 60 // 24 hours

	NodeTerminalPodName = "kite-node-terminal-agent"

	KubectlAnnotation = "kubectl.kubernetes.io/last-applied-configuration"
)

var (
	Port            = "8080"
	JwtSecret       = "kite-default-jwt-secret-key-change-in-production"
	OAuthEnabled    = false
	OAuthProviders  = ""
	OAuthAllowUsers = []string{} // Deprecated, use rbac config instead
	EnableAnalytics = false

	NodeTerminalImage = "busybox:latest"

	WebhookUsername = os.Getenv("WEBHOOK_USERNAME")
	WebhookPassword = os.Getenv("WEBHOOK_PASSWORD")
	WebhookEnabled  = WebhookUsername != "" && WebhookPassword != ""

	KiteUsername         = os.Getenv("KITE_USERNAME")
	KitePassword         = os.Getenv("KITE_PASSWORD")
	PasswordLoginEnabled = KiteUsername != "" && KitePassword != ""

	Readonly = false

	RolesConfigPath = "/config/roles.yaml"

	DBType = "sqlite"
	DBDSN  = "dev.db"

	KiteEncryptKey = "kite-default-encryption-key-change-in-production"
)

func LoadEnvs() {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		JwtSecret = secret
	}

	if enabled := os.Getenv("OAUTH_ENABLED"); enabled == "true" {
		OAuthEnabled = true
		if providers := os.Getenv("OAUTH_PROVIDERS"); providers != "" {
			OAuthProviders = providers
		} else {
			klog.Warning("OAUTH_PROVIDERS is not set, OAuth will not work as expected")
		}
		if allowUsers := os.Getenv("OAUTH_ALLOW_USERS"); allowUsers != "" {
			OAuthAllowUsers = strings.Split(allowUsers, ",")
		}
	}

	if port := os.Getenv("PORT"); port != "" {
		Port = port
	}

	if analytics := os.Getenv("ENABLE_ANALYTICS"); analytics == "true" {
		EnableAnalytics = true
	}

	if nodeTerminalImage := os.Getenv("NODE_TERMINAL_IMAGE"); nodeTerminalImage != "" {
		NodeTerminalImage = nodeTerminalImage
	}

	if !OAuthEnabled && !PasswordLoginEnabled {
		klog.Warning("OAuth and Password login are both disabled, DO NOT USE IN PRODUCTION!!!")
	}

	if rolePath := os.Getenv("ROLES_CONFIG_PATH"); rolePath != "" {
		RolesConfigPath = rolePath
	}

	if dbDSN := os.Getenv("DB_DSN"); dbDSN != "" {
		DBDSN = dbDSN
	}

	if dbType := os.Getenv("DB_TYPE"); dbType != "" {
		if dbType != "sqlite" && dbType != "mysql" && dbType != "postgres" {
			klog.Fatalf("Invalid DB_TYPE: %s, must be one of sqlite, mysql, postgres", dbType)
		}
		DBType = dbType
	}

	if key := os.Getenv("KITE_ENCRYPT_KEY"); key != "" {
		KiteEncryptKey = key
	} else {
		klog.Warningf("KITE_ENCRYPT_KEY is not set, using default key, this is not secure for production!")
	}
}
