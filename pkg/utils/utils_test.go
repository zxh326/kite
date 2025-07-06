package utils

import (
	"testing"
)

func TestGetImageRegistryAndRepo(t *testing.T) {
	testcase := []struct {
		image    string
		registry string
		repo     string
	}{
		{"nginx", "", "library/nginx"},
		{"nginx:latest", "", "library/nginx"},
		{"zzde/kite:latest", "", "zzde/kite"},
		{"docker.io/library/nginx", "docker.io", "library/nginx"},
		{"docker.io/library/nginx:latest", "docker.io", "library/nginx"},
		{"gcr.io/my-project/my-image", "gcr.io", "my-project/my-image"},
		{"gcr.io/my-project/my-image:tag", "gcr.io", "my-project/my-image"},
		{"quay.io/my-org/my-repo", "quay.io", "my-org/my-repo"},
		{"quay.io/my-org/my-repo:tag", "quay.io", "my-org/my-repo"},
		{"registry.example.com/my-repo/test", "registry.example.com", "my-repo/test"},
	}
	for _, tc := range testcase {
		registry, repo := GetImageRegistryAndRepo(tc.image)
		if registry != tc.registry || repo != tc.repo {
			t.Errorf("GetImageRegistryAndRepo(%q) = (%q, %q), want (%q, %q)", tc.image, registry, repo, tc.registry, tc.repo)
		}
	}
}
