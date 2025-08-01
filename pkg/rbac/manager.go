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

// LoadRolesConfig parses roles.yaml and returns RolesConfig
func LoadRolesConfig(path string) (*common.RolesConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg common.RolesConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}
