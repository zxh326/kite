package utils

import (
	"regexp"

	"k8s.io/apimachinery/pkg/util/rand"
)

// InjectAnalytics dynamically injects analytics script into HTML content
func InjectAnalytics(htmlContent string) string {
	analyticsScript := `<script defer src="https://cloud.umami.is/script.js" data-website-id="c3d8a914-abbc-4eed-9699-a9192c4bef9e" data-exclude-search="true" data-exclude-hash="true" data-do-not-track="true"></script>`

	// Inject analytics script before closing </head> tag
	re := regexp.MustCompile(`</head>`)
	return re.ReplaceAllString(htmlContent, "  "+analyticsScript+"\n  </head>")
}

func RandomString(length int) string {
	return rand.String(length)
}
