package common

import (
	"os"

	"k8s.io/klog/v2"
)

const (
	JWTExpirationSeconds = 24 * 60 * 60 // 24 hours

	NodeTerminalPodName = "kite-node-terminal-agent"
)

var (
	Port            = "8080"
	PrometheusURL   = ""
	JwtSecret       = "default_secret_key"
	OAuthEnabled    = false
	OAuthProviders  = ""
	OAuthAllowUsers = ""
	EnableAnalytics = false

	NodeTerminalImage = "busybox:latest"

	WebhookUsername = "kite-webhook"
	WebhookPassword = "kite-webhook-password"
)

func LoadEnvs() {
	if url := os.Getenv("PROMETHEUS_URL"); url != "" {
		PrometheusURL = url
	} else {
		klog.Warning("PROMETHEUS_URL is not set, some features may not work as expected")
	}
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
			OAuthAllowUsers = allowUsers
		} else {
			klog.Warning("OAUTH_ALLOW_USERS is not set, OAuth will not work as expected")
		}
	} else {
		klog.Warning("OAUTH_ENABLED is not set to true, do not use in PRODUCTION")
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

	if webhookUsername := os.Getenv("WEBHOOK_USERNAME"); webhookUsername != "" {
		WebhookUsername = webhookUsername
	}
	if webhookPassword := os.Getenv("WEBHOOK_PASSWORD"); webhookPassword != "" {
		WebhookPassword = webhookPassword
	} else {
		klog.Warning("WEBHOOK_PASSWORD is not set, using default password")
	}
}
