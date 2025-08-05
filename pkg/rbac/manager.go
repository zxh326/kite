package rbac

import (
	"fmt"
	"os"
	"sync"

	"github.com/fsnotify/fsnotify"
	"github.com/zxh326/kite/pkg/common"
	"gopkg.in/yaml.v3"
	"k8s.io/klog/v2"
)

var (
	RBACConfig *common.RolesConfig
	once       sync.Once
	rwlock     sync.RWMutex
)

var (
	defaultAdminRole = common.Role{
		Name:       "admin",
		Verbs:      []string{"*"},
		Resources:  []string{"*"},
		Namespaces: []string{"*"},
		Clusters:   []string{"*"},
	}
	defaultViewerRole = common.Role{
		Name:       "viewer",
		Verbs:      []string{"get"},
		Resources:  []string{"*"},
		Namespaces: []string{"*"},
		Clusters:   []string{"*"},
	}

	defaultLimitedRole = common.Role{
		Name:       "limited",
		Verbs:      []string{"get"},
		Resources:  []string{"not_exist_resource"},
		Namespaces: []string{"*"},
		Clusters:   []string{"*"},
	}
)

func InitRBAC(configPath string) {
	once.Do(func() {
		cfg, err := LoadRolesConfig(configPath)
		if err != nil {
			panic(fmt.Sprintf("Failed to load RBAC configuration from %s: %v. Ensure the file exists and has correct permissions.", configPath, err))
		}
		RBACConfig = cfg
		go watchConfig(configPath)
	})
}

func watchConfig(path string) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return
	}
	defer func() {
		if err := watcher.Close(); err != nil {
			klog.Errorf("Failed to close watcher: %v", err)
		}
	}()

	// Add initial watch on the path
	_ = watcher.Add(path)

	// Function to reload configuration
	reloadConfig := func() {
		klog.V(1).Infof("Reloading RBAC configuration from %s", path)
		cfg, err := LoadRolesConfig(path)
		if err != nil {
			klog.Errorf("Failed to reload RBAC configuration: %v", err)
			return
		}
		rwlock.Lock()
		RBACConfig = cfg
		rwlock.Unlock()
		klog.V(1).Info("RBAC configuration reloaded successfully")
	}

	for {
		select {
		case event := <-watcher.Events:
			klog.V(1).Infof("RBAC config file event: %s", event)

			// Handle different types of events
			if event.Op&fsnotify.Remove == fsnotify.Remove || event.Op&fsnotify.Rename == fsnotify.Rename {
				// ConfigMap updates in k8s can trigger Remove or Rename events as symlinks are updated
				klog.V(1).Infof("ConfigMap change detected (remove/rename). Re-adding watcher for %s", path)
				_ = watcher.Remove(event.Name)

				// Wait a moment for k8s to finish updating the symlink/file
				// Re-add the watcher to the path
				_ = watcher.Add(path)

				// Then reload the configuration
				reloadConfig()
			} else if event.Op&fsnotify.Write == fsnotify.Write || event.Op&fsnotify.Create == fsnotify.Create {
				// Regular file write or create event
				klog.V(1).Infof("File write/create detected. Reloading configuration")
				reloadConfig()
			}
		case err := <-watcher.Errors:
			klog.Errorf("RBAC config watcher error: %v", err)
		}
	}
}

// for compatibility with old configure
func compatibleRoleConfig(role *common.RolesConfig) {
	existAdmin := false
	existViewer := false
	for _, r := range role.Roles {
		if r.Name == defaultAdminRole.Name {
			existAdmin = true
		}
		if r.Name == defaultViewerRole.Name {
			existViewer = true
		}
	}
	if !existAdmin {
		role.Roles = append(role.Roles, defaultAdminRole)
	}
	if !existViewer {
		role.Roles = append(role.Roles, defaultViewerRole)
	}

	if len(common.OAuthAllowUsers) > 0 || len(common.KiteUsername) > 0 {
		if role.RoleMapping == nil {
			role.RoleMapping = make([]common.RoleMapping, 0)
		}

		// Ensure admin role mapping is set if OAuth users or Kite username are defined
		if len(common.OAuthAllowUsers) > 0 {
			klog.Infof("Adding OAuth users to viewer role mapping: %v", common.OAuthAllowUsers)
			role.RoleMapping = append(role.RoleMapping, common.RoleMapping{
				Name:  defaultViewerRole.Name,
				Users: common.OAuthAllowUsers,
			})
		}
		if len(common.KiteUsername) > 0 {
			klog.Infof("Adding Kite username to viewer role mapping: %s", common.KiteUsername)
			role.RoleMapping = append(role.RoleMapping, common.RoleMapping{
				Name:  defaultViewerRole.Name,
				Users: []string{common.KiteUsername},
			})
		}
	}

	if !common.OAuthEnabled && !common.PasswordLoginEnabled {
		klog.Infof("Adding anonymous user to viewer role mapping")
		role.Roles = append(role.Roles, defaultLimitedRole)
		role.RoleMapping = append(role.RoleMapping, common.RoleMapping{
			Name:  defaultLimitedRole.Name,
			Users: []string{"anonymous"},
		})
	}
}

// LoadRolesConfig parses roles.yaml and returns RolesConfig
func LoadRolesConfig(path string) (*common.RolesConfig, error) {
	cfg := new(common.RolesConfig)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			compatibleRoleConfig(cfg)
			return cfg, nil
		}
		return nil, err
	}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, err
	}
	compatibleRoleConfig(cfg)
	return cfg, nil
}
