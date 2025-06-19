package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/common"
)

func ReadonlyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if common.Readonly {
			if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error": "Server is in read-only mode, write operations are not allowed",
				})
				return
			}
		}
		c.Next()
	}
}
