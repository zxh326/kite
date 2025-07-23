package rbac

import (
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
)

var (
	defaultRoles = []common.Role{
		{
			Name:       "admin",
			Verbs:      []string{"*"},
			Resources:  []string{"*"},
			Namespaces: []string{"*"},
			Clusters:   []string{"*"},
		},
		{
			Name:       "viewer",
			Verbs:      []string{"get"},
			Resources:  []string{"*"},
			Namespaces: []string{"*"},
			Clusters:   []string{"*"},
		},
	}
)

func InitRBAC(configPath string) {
	once.Do(func() {
		cfg, err := LoadRolesConfig(configPath)
		if err != nil {
			panic("Failed to load roles.yaml: " + err.Error())
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
	mu := &sync.Mutex{}
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
					mu.Lock()
					RBACConfig = cfg
					mu.Unlock()
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
		role.Roles = append(role.Roles, defaultRoles...)
		// Ensure admin role mapping is set if OAuth users or Kite username are defined
		if len(common.OAuthAllowUsers) > 0 {
			role.RoleMapping = append(role.RoleMapping, common.RoleMapping{
				Name:  "viewer",
				Users: common.OAuthAllowUsers,
			})
		}
		if len(common.KiteUsername) > 0 {
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
