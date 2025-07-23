package rbac

import (
	"os"
	"slices"

	"gopkg.in/yaml.v3"
)

type Role struct {
	Name        string   `yaml:"name"`
	Description string   `yaml:"description"`
	Clusters    []string `yaml:"clusters"`
	Resources   []string `yaml:"resources"`
	Namespaces  []string `yaml:"namespaces"`
	Verbs       []string `yaml:"verbs"`
}

type RoleMapping struct {
	Name       string   `yaml:"name"`
	Users      []string `yaml:"users,omitempty"`
	OIDCGroups []string `yaml:"oidcGroups,omitempty"`
}

type RolesConfig struct {
	Roles       []Role        `yaml:"roles"`
	RoleMapping []RoleMapping `yaml:"roleMapping"`
}

var (
	defaultAdminRole = Role{
		Name:        "admin",
		Description: "Administrator with full access",
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"*"},
	}

	defaultViewerRole = Role{
		Name:        "viewer",
		Description: "Read-only access to all resources",
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"get"},
	}
)

// LoadRolesConfig parses roles.yaml and returns RolesConfig
func LoadRolesConfig(path string) (*RolesConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg RolesConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	cfg.Roles = append(cfg.Roles, defaultAdminRole, defaultViewerRole)
	return &cfg, nil
}

// CanAccess checks if user/oidcGroup can access resource with verb in cluster/namespace
func (cfg *RolesConfig) CanAccess(user string, oidcGroups []string, resource, verb, cluster, namespace string) bool {
	role := cfg.MergeUserPermissions(user, oidcGroups)
	if role == nil {
		return false
	}
	return match(role.Clusters, cluster) &&
		match(role.Resources, resource) &&
		match(role.Namespaces, namespace) &&
		match(role.Verbs, verb)
}

// getUserRoles returns all roles for a user/oidcGroups
func (cfg *RolesConfig) getUserRoles(user string, oidcGroups []string) []Role {
	var roles []Role
	for _, mapping := range cfg.RoleMapping {
		if contains(mapping.Users, "*") || contains(mapping.Users, user) {
			if r := cfg.findRole(mapping.Name); r != nil {
				roles = append(roles, *r)
			}
		}
		for _, group := range oidcGroups {
			if contains(mapping.OIDCGroups, group) {
				if r := cfg.findRole(mapping.Name); r != nil {
					roles = append(roles, *r)
				}
			}
		}
	}
	return roles
}

func (cfg *RolesConfig) MergeUserPermissions(user string, oidcGroups []string) *Role {
	roles := cfg.getUserRoles(user, oidcGroups)
	if len(roles) == 0 {
		return nil
	}
	merged := &Role{
		Clusters:   []string{},
		Resources:  []string{},
		Namespaces: []string{},
		Verbs:      []string{},
	}
	for _, r := range roles {
		merged.Clusters = merge(merged.Clusters, r.Clusters)
		merged.Resources = merge(merged.Resources, r.Resources)
		merged.Namespaces = merge(merged.Namespaces, r.Namespaces)
		merged.Verbs = merge(merged.Verbs, r.Verbs)
	}
	return merged
}

func (cfg *RolesConfig) findRole(name string) *Role {
	for _, r := range cfg.Roles {
		if r.Name == name {
			return &r
		}
	}
	return nil
}

func match(list []string, val string) bool {
	for _, v := range list {
		if v == "*" || v == val {
			return true
		}
	}
	return false
}

func contains(list []string, val string) bool {
	return slices.Contains(list, val)
}

func merge(a, b []string) []string {
	if contains(a, "*") {
		return []string{"*"}
	}
	if contains(b, "*") {
		return []string{"*"}
	}

	for _, item := range b {
		if !contains(a, item) {
			a = append(a, item)
		}
	}
	return a
}

func (r *Role) CanAccessCluster(cluster string) bool {
	if contains(r.Clusters, "*") || contains(r.Clusters, cluster) {
		return true
	}
	return false
}
