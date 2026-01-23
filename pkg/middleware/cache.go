package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// staticExtensions defines the file extensions for static assets that should be cached
var staticExtensions = []string{
	".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
	".woff", ".woff2", ".ttf", ".eot",
}

// StaticCache adds cache-control headers for static assets
func StaticCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Check if the request is for a static asset
		shouldCache := strings.HasPrefix(path, "/assets/")
		if !shouldCache {
			for _, ext := range staticExtensions {
				if strings.HasSuffix(path, ext) {
					shouldCache = true
					break
				}
			}
		}

		if shouldCache {
			// Cache static assets for 1 year (31536000 seconds)
			// immutable means the resource won't change at this URL
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		}

		c.Next()
	}
}
