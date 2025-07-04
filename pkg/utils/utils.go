package utils

import (
	"regexp"
	"strings"

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

func ToEnvName(input string) string {
	s := input
	s = strings.ReplaceAll(s, "-", "_")
	s = strings.ReplaceAll(s, ".", "_")
	s = strings.ReplaceAll(s, "/", "_")
	s = strings.ToUpper(s)
	return s
}

func GetImageRegistryAndRepo(image string) (string, string) {
	image = strings.SplitN(image, ":", 2)[0]
	parts := strings.Split(image, "/")
	if len(parts) == 1 {
		return "", "library/" + parts[0]
	}
	if len(parts) > 1 {
		if strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":") {
			return parts[0], strings.Join(parts[1:], "/")
		}
		return "", strings.Join(parts, "/")
	}
	return "", image
}
