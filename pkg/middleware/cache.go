package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// StaticCache adds cache-control headers for static assets
func StaticCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Check if the request is for a static asset (js, css, images, fonts, etc.)
		if strings.HasPrefix(path, "/assets/") ||
			strings.HasSuffix(path, ".js") ||
			strings.HasSuffix(path, ".css") ||
			strings.HasSuffix(path, ".png") ||
			strings.HasSuffix(path, ".jpg") ||
			strings.HasSuffix(path, ".jpeg") ||
			strings.HasSuffix(path, ".gif") ||
			strings.HasSuffix(path, ".svg") ||
			strings.HasSuffix(path, ".ico") ||
			strings.HasSuffix(path, ".woff") ||
			strings.HasSuffix(path, ".woff2") ||
			strings.HasSuffix(path, ".ttf") ||
			strings.HasSuffix(path, ".eot") {
			// Cache static assets for 1 year (31536000 seconds)
			// immutable means the resource won't change at this URL
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
		}

		c.Next()
	}
}
