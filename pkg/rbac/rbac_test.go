package rbac

import (
	"testing"

	"github.com/zxh326/kite/pkg/common"
)

func TestCanAccess(t *testing.T) {
	// Define test roles
	adminRole := common.Role{
		Name:        "admin",
		Description: "Administrator with full access",
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"*"},
	}

	viewerRole := common.Role{
		Name:        "viewer",
		Description: "Read-only access to all resources",
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"get"},
	}

	devRole := common.Role{
		Name:        "developer",
		Description: "Developer access to specific resources",
		Clusters:    []string{"dev-cluster"},
		Resources:   []string{"pod", "deployment"},
		Namespaces:  []string{"dev", "test"},
		Verbs:       []string{"get", "create", "update", "delete"},
	}

	prodViewRole := common.Role{
		Name:        "prod-viewer",
		Description: "Read-only access to production",
		Clusters:    []string{"prod-cluster"},
		Resources:   []string{"pod", "service"},
		Namespaces:  []string{"prod"},
		Verbs:       []string{"get"},
	}

	tests := []struct {
		name       string
		roles      []common.Role
		mappings   []common.RoleMapping
		user       string
		oidcGroups []string
		resource   string
		verb       string
		cluster    string
		namespace  string
		expected   bool
	}{
		{
			name:  "user with no permissions",
			roles: []common.Role{adminRole, viewerRole},
			mappings: []common.RoleMapping{
				{Name: "admin", Users: []string{"admin-user"}},
				{Name: "viewer", Users: []string{"viewer-user"}},
			},
			user:       "unprivileged-user",
			oidcGroups: []string{},
			resource:   "pod",
			verb:       "get",
			cluster:    "dev-cluster",
			namespace:  "default",
			expected:   false,
		},
		{
			name:  "admin user can access anything",
			roles: []common.Role{adminRole},
			mappings: []common.RoleMapping{
				{Name: "admin", Users: []string{"admin-user"}},
			},
			user:       "admin-user",
			oidcGroups: []string{},
			resource:   "any-resource",
			verb:       "any-verb",
			cluster:    "any-cluster",
			namespace:  "any-namespace",
			expected:   true,
		},
		{
			name:  "viewer can only read",
			roles: []common.Role{viewerRole},
			mappings: []common.RoleMapping{
				{Name: "viewer", Users: []string{"viewer-user"}},
			},
			user:       "viewer-user",
			oidcGroups: []string{},
			resource:   "pod",
			verb:       "get",
			cluster:    "any-cluster",
			namespace:  "any-namespace",
			expected:   true,
		},
		{
			name:  "viewer cannot write",
			roles: []common.Role{viewerRole},
			mappings: []common.RoleMapping{
				{Name: "viewer", Users: []string{"viewer-user"}},
			},
			user:       "viewer-user",
			oidcGroups: []string{},
			resource:   "pod",
			verb:       "create",
			cluster:    "any-cluster",
			namespace:  "any-namespace",
			expected:   false,
		},
		{
			name:  "developer in correct cluster/namespace/resource",
			roles: []common.Role{devRole},
			mappings: []common.RoleMapping{
				{Name: "developer", Users: []string{"dev-user"}},
			},
			user:       "dev-user",
			oidcGroups: []string{},
			resource:   "deployment",
			verb:       "update",
			cluster:    "dev-cluster",
			namespace:  "dev",
			expected:   true,
		},
		{
			name:  "developer in wrong cluster",
			roles: []common.Role{devRole},
			mappings: []common.RoleMapping{
				{Name: "developer", Users: []string{"dev-user"}},
			},
			user:       "dev-user",
			oidcGroups: []string{},
			resource:   "deployment",
			verb:       "update",
			cluster:    "prod-cluster",
			namespace:  "dev",
			expected:   false,
		},
		{
			name:  "user with multiple roles",
			roles: []common.Role{devRole, prodViewRole},
			mappings: []common.RoleMapping{
				{Name: "developer", Users: []string{"multi-role-user"}},
				{Name: "prod-viewer", Users: []string{"multi-role-user"}},
			},
			user:       "multi-role-user",
			oidcGroups: []string{},
			resource:   "pod",
			verb:       "get",
			cluster:    "prod-cluster",
			namespace:  "prod",
			expected:   true,
		},
		{
			name:  "user with OIDC group permissions",
			roles: []common.Role{viewerRole},
			mappings: []common.RoleMapping{
				{Name: "viewer", OIDCGroups: []string{"viewers-group"}},
			},
			user:       "group-member",
			oidcGroups: []string{"viewers-group"},
			resource:   "pod",
			verb:       "get",
			cluster:    "any-cluster",
			namespace:  "any-namespace",
			expected:   true,
		},
		{
			name:  "wildcard in user list",
			roles: []common.Role{viewerRole},
			mappings: []common.RoleMapping{
				{Name: "viewer", Users: []string{"*"}},
			},
			user:       "any-user",
			oidcGroups: []string{},
			resource:   "pod",
			verb:       "get",
			cluster:    "any-cluster",
			namespace:  "any-namespace",
			expected:   true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			RBACConfig = &common.RolesConfig{
				Roles:       tc.roles,
				RoleMapping: tc.mappings,
			}
			result := CanAccess(common.User{Username: tc.user, OIDCGroups: tc.oidcGroups}, tc.resource, tc.verb, tc.cluster, tc.namespace)

			if result != tc.expected {
				t.Errorf("Expected CanAccess to return %v but got %v", tc.expected, result)
			}
		})
	}
}
