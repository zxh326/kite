package rbac

import (
	"slices"
	"testing"
)

func TestMerge(t *testing.T) {
	tests := []struct {
		name     string
		a        []string
		b        []string
		expected []string
	}{
		{
			name:     "a contains wildcard",
			a:        []string{"*", "pod"},
			b:        []string{"deployment", "service"},
			expected: []string{"*"},
		},
		{
			name:     "b contains wildcard",
			a:        []string{"pod", "deployment"},
			b:        []string{"service", "*"},
			expected: []string{"*"},
		},
		{
			name:     "both contain unique items",
			a:        []string{"pod", "deployment"},
			b:        []string{"service", "ingress"},
			expected: []string{"pod", "deployment", "service", "ingress"},
		},
		{
			name:     "overlapping items",
			a:        []string{"pod", "deployment"},
			b:        []string{"deployment", "service"},
			expected: []string{"pod", "deployment", "service"},
		},
		{
			name:     "empty a",
			a:        []string{},
			b:        []string{"pod", "service"},
			expected: []string{"pod", "service"},
		},
		{
			name:     "empty b",
			a:        []string{"pod", "service"},
			b:        []string{},
			expected: []string{"pod", "service"},
		},
		{
			name:     "both empty",
			a:        []string{},
			b:        []string{},
			expected: []string{},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := merge(tc.a, tc.b)

			// Compare lengths
			if len(result) != len(tc.expected) {
				t.Errorf("Expected length %d, got %d", len(tc.expected), len(result))
			}

			// Check all expected elements are in result
			for _, e := range tc.expected {
				if !slices.Contains(result, e) {
					t.Errorf("Expected %v to contain %s", result, e)
				}
			}

			// Check all result elements are in expected
			for _, r := range result {
				if !slices.Contains(tc.expected, r) {
					t.Errorf("Unexpected element %s in result %v", r, result)
				}
			}
		})
	}
}

func TestCanAccess(t *testing.T) {
	// Define test roles
	adminRole := Role{
		Name:        "admin",
		Description: "Administrator with full access",
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"*"},
	}

	viewerRole := Role{
		Name:        "viewer",
		Description: "Read-only access to all resources",
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"get"},
	}

	devRole := Role{
		Name:        "developer",
		Description: "Developer access to specific resources",
		Clusters:    []string{"dev-cluster"},
		Resources:   []string{"pod", "deployment"},
		Namespaces:  []string{"dev", "test"},
		Verbs:       []string{"get", "create", "update", "delete"},
	}

	prodViewRole := Role{
		Name:        "prod-viewer",
		Description: "Read-only access to production",
		Clusters:    []string{"prod-cluster"},
		Resources:   []string{"pod", "service"},
		Namespaces:  []string{"prod"},
		Verbs:       []string{"get"},
	}

	tests := []struct {
		name       string
		roles      []Role
		mappings   []RoleMapping
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
			roles: []Role{adminRole, viewerRole},
			mappings: []RoleMapping{
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
			roles: []Role{adminRole},
			mappings: []RoleMapping{
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
			roles: []Role{viewerRole},
			mappings: []RoleMapping{
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
			roles: []Role{viewerRole},
			mappings: []RoleMapping{
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
			roles: []Role{devRole},
			mappings: []RoleMapping{
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
			roles: []Role{devRole},
			mappings: []RoleMapping{
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
			roles: []Role{devRole, prodViewRole},
			mappings: []RoleMapping{
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
			roles: []Role{viewerRole},
			mappings: []RoleMapping{
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
			roles: []Role{viewerRole},
			mappings: []RoleMapping{
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
			cfg := &RolesConfig{
				Roles:       tc.roles,
				RoleMapping: tc.mappings,
			}

			result := cfg.CanAccess(tc.user, tc.oidcGroups, tc.resource, tc.verb, tc.cluster, tc.namespace)

			if result != tc.expected {
				t.Errorf("Expected CanAccess to return %v but got %v", tc.expected, result)
			}
		})
	}
}
