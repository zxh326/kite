package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/rbac"
	"k8s.io/klog/v2"
)

func RBACMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}

		userInfo, ok := user.(common.User)
		if !ok {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Invalid user information"})
			return
		}

		userKey := userInfo.Username
		if userKey == "" {
			userKey = userInfo.Name
		}
		cs := c.MustGet("cluster").(*cluster.ClientSet)

		verbs := method2verb(c.Request.Method)
		ns, resource := url2namespaceresource(c.Request.URL.Path)
		if ns == "" || resource == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid resource URL"})
			return
		}

		canAccess := rbac.RBACConfig.CanAccess(userKey, userInfo.OIDCGroups, resource, verbs, cs.Name, ns)
		klog.V(5).Infof("RBAC Check - User: %s, OIDC Groups: %v, Resource: %s, Verb: %s, Cluster: %s, Namespace: %s, Access: %v",
			userKey, userInfo.OIDCGroups, resource, verbs, cs.Name, ns, canAccess)
		if canAccess {
			c.Next()
		} else {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		}
	}
}

func method2verb(method string) string {
	switch method {
	case http.MethodPost:
		return "create"
	case http.MethodPut, http.MethodPatch:
		return "update"
	default:
		return strings.ToLower(method)
	}
}

// url2namespaceresource converts a URL path to a resource type.
// For example:
//
// - /api/v1/pods/default/pods => default, pods
// - /api/v1/pvs/_all/some-pv => _all, some-pv
// - /api/v1/pods/default => default, pods
// - /api/v1/pods => "", pods
func url2namespaceresource(url string) (namespace string, resource string) {
	// Split the URL into its components
	parts := strings.Split(url, "/")
	if len(parts) < 4 {
		return
	}
	fmt.Println(len(parts), parts)
	resource = parts[3] // The resource type is always the third part
	if len(parts) > 4 {
		namespace = parts[4]
	} else {
		namespace = "_all" // All namespaces
	}
	return
}
