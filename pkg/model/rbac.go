package model

type Role struct {
	Model

	Name        string `json:"name" gorm:"type:varchar(100);uniqueIndex;not null"`
	Description string `json:"description" gorm:"type:text"`
	IsSystem    bool   `json:"isSystem" gorm:"type:boolean;not null;default:false"`

	// Rules
	Clusters   SliceString `json:"clusters" gorm:"type:text"`
	Resources  SliceString `json:"resources" gorm:"type:text"`
	Namespaces SliceString `json:"namespaces" gorm:"type:text"`
	Verbs      SliceString `json:"verbs" gorm:"type:text"`

	Assignments []RoleAssignment `json:"assignments" gorm:"foreignKey:RoleID;constraint:OnDelete:CASCADE"`
}

// RoleAssignment maps a role to a subject which can be a user or an OIDC group.
// SubjectType: 'user' or 'group'
type RoleAssignment struct {
	Model

	RoleID uint `json:"roleId" gorm:"index;not null;constraint:OnDelete:CASCADE"`

	SubjectType string `json:"subjectType" gorm:"type:varchar(20);not null"`
	Subject     string `json:"subject" gorm:"type:varchar(255);not null"`
}

// Convenience constants for SubjectType
const (
	SubjectTypeUser  = "user"
	SubjectTypeGroup = "group"
)

var (
	DefaultAdminRole = Role{
		Name:        "admin",
		Description: "Administrator role with full access",
		IsSystem:    true,
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"*"},
	}
	DefaultViewerRole = Role{
		Name:        "viewer",
		Description: "Viewer role with read-only access",
		IsSystem:    true,
		Clusters:    []string{"*"},
		Resources:   []string{"*"},
		Namespaces:  []string{"*"},
		Verbs:       []string{"get", "log"},
	}
)

func GetRoleByName(name string) (*Role, error) {
	var role Role
	if err := DB.Where("name = ?", name).First(&role).Error; err != nil {
		return nil, err
	}
	return &role, nil
}

func AddRoleAssignment(roleName string, subjectType, subject string) error {
	role, err := GetRoleByName(roleName)
	if err != nil {
		return err
	}
	assignment := RoleAssignment{
		RoleID:      role.ID,
		SubjectType: subjectType,
		Subject:     subject,
	}
	return DB.Create(&assignment).Error
}

func InitDefaultRole() error {
	var err error
	// Create default roles if they don't exist
	if err = DB.Where("name = ?", DefaultAdminRole.Name).FirstOrCreate(&DefaultAdminRole).Error; err != nil {
		return err
	}
	if err = DB.Where("name = ?", DefaultViewerRole.Name).FirstOrCreate(&DefaultViewerRole).Error; err != nil {
		return err
	}
	return nil
}
