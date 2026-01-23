package middleware

import (
	"github.com/gin-gonic/gin"
)

// StaticCache adds cache-control headers for static assets
func StaticCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Next()
	}
}
