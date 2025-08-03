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
	_ = watcher.Add(path)
	for {
		select {
		case event := <-watcher.Events:
			klog.V(5).Infof("RBAC config file event: %s", event)
			// k8s configmaps uses symlinks, we need this workaround to detect the real file change
			if event.Op == fsnotify.Remove {
				_ = watcher.Remove(event.Name)
				// add a new watcher pointing to the new symlink/file
				_ = watcher.Add(path)
			}
			if event.Op&fsnotify.Write == fsnotify.Write || event.Op&fsnotify.Create == fsnotify.Create {
				cfg, err := LoadRolesConfig(path)
				if err == nil {
					rwlock.Lock()
					RBACConfig = cfg
					rwlock.Unlock()
				}
			}
		case err := <-watcher.Errors:
			klog.Errorf("RBAC config watcher error: %v", err)
		}
	}
}

// for compatibility with old configure
func compatibleRoleConfig(role *common.RolesConfig) {
	if len(common.OAuthAllowUsers) > 0 || len(common.KiteUsername) > 0 {
		if role.RoleMapping == nil {
			role.RoleMapping = make([]common.RoleMapping, 0)
		}
		existAdmin := false
		existViewer := false
		for _, r := range role.Roles {
			if r.Name == "admin" {
				existAdmin = true
			}
			if r.Name == "viewer" {
				existViewer = true
			}
		}
		if !existAdmin {
			role.Roles = append(role.Roles, defaultAdminRole)
		}
		if !existViewer {
			role.Roles = append(role.Roles, defaultViewerRole)
		}

		// Ensure admin role mapping is set if OAuth users or Kite username are defined
		if len(common.OAuthAllowUsers) > 0 {
			klog.Infof("Adding OAuth users to viewer role mapping: %v", common.OAuthAllowUsers)
			role.RoleMapping = append(role.RoleMapping, common.RoleMapping{
				Name:  "viewer",
				Users: common.OAuthAllowUsers,
			})
		}
		if len(common.KiteUsername) > 0 {
			klog.Infof("Adding Kite username to viewer role mapping: %s", common.KiteUsername)
			role.RoleMapping = append(role.RoleMapping, common.RoleMapping{
				Name:  "viewer",
				Users: []string{common.KiteUsername},
			})
		}
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
