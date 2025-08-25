package common

type SearchResult struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Namespace    string `json:"namespace,omitempty"`
	ResourceType string `json:"resourceType"`
	CreatedAt    string `json:"createdAt"`
}

type RelatedResource struct {
	Type       string `json:"type"`
	APIVersion string `json:"apiVersion,omitempty"`
	Name       string `json:"name"`
	Namespace  string `json:"namespace,omitempty"`
}

type Action string

const (
	ActionRestart     Action = "restart"
	ActionUpdateImage Action = "updateImage"
)

type WebhookRequest struct {
	Action    Action `json:"action" binding:"required,oneof=restart updateImage"`
	Resource  string `json:"resource" binding:"required,oneof=deployments statefulsets daemonsets"`
	Name      string `json:"name" binding:"required"` // Name of the resource to act upon
	Namespace string `json:"namespace"`

	// Optional data for the action
	// ActionUpdateImage => containerName:ImageName
	Data string `json:"data,omitempty" binding:"required_if=Action updateImage"` // Must be printable ASCII characters
}

type Resource struct {
	Allocatable int64 `json:"allocatable"`
	Requested   int64 `json:"requested"`
	Limited     int64 `json:"limited"`
}

type ResourceMetric struct {
	CPU Resource `json:"cpu,omitempty"`
	Mem Resource `json:"memory,omitempty"`
}

type PasswordLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type ImportClustersRequest struct {
	Config string `json:"config" binding:"required"`
}

type ClusterInfo struct {
	Name      string `json:"name"`
	Version   string `json:"version"`
	IsDefault bool   `json:"isDefault"`
}

// User represents a generic user from any OAuth provider
type User struct {
	ID         string   `json:"id,omitempty"`
	Username   string   `json:"username,omitempty"`
	Name       string   `json:"name,omitempty"`
	AvatarURL  string   `json:"avatar_url,omitempty"`
	Provider   string   `json:"provider,omitempty"`
	OIDCGroups []string `json:"oidc_groups,omitempty"` // Optional OIDC groups for RBAC
	Roles      []Role   `json:"roles,omitempty"`       // Optional role for RBAC
}

func (u *User) Key() string {
	if u.Username != "" {
		return u.Username
	}
	if u.Name != "" {
		return u.Name
	}
	return u.ID
}
