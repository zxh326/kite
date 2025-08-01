package middleware

import (
	"testing"
)

func TestUrl2NamespaceResource(t *testing.T) {
	testCases := []struct {
		name          string
		url           string
		wantNamespace string
		wantResource  string
	}{
		{
			name:          "valid URL with namespace and resource",
			url:           "/api/v1/pods/default/pods",
			wantNamespace: "default",
			wantResource:  "pods",
		},
		{
			name:          "valid URL with all namespace and specific resource",
			url:           "/api/v1/pvs/_all/some-pv",
			wantNamespace: "_all",
			wantResource:  "pvs",
		},
		{
			name:          "valid URL with namespace only",
			url:           "/api/v1/pods/default",
			wantNamespace: "default",
			wantResource:  "pods",
		},
		{
			name:          "invalid URL - too short (3 parts)",
			url:           "/api/v1",
			wantNamespace: "",
			wantResource:  "",
		},
		{
			name:          "invalid URL - missing namespace",
			url:           "/api/v1/pods",
			wantNamespace: "_all",
			wantResource:  "pods",
		},
		{
			name:          "URL with additional parts",
			url:           "/api/v1/pods/default/some-pods",
			wantNamespace: "default",
			wantResource:  "pods",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			gotNamespace, gotResource := url2namespaceresource(tc.url)
			if gotNamespace != tc.wantNamespace || gotResource != tc.wantResource {
				t.Errorf("url2namespaceresource(%q) = (%q, %q), want (%q, %q)",
					tc.url, gotNamespace, gotResource, tc.wantNamespace, tc.wantResource)
			}
		})
	}
}
