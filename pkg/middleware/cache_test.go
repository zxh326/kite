package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestStaticCache(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testCases := []struct {
		name               string
		path               string
		expectedCacheValue string
		shouldHaveCache    bool
	}{
		{
			name:               "JS file in assets",
			path:               "/assets/main.js",
			expectedCacheValue: "public, max-age=31536000, immutable",
			shouldHaveCache:    true,
		},
		{
			name:               "CSS file in assets",
			path:               "/assets/styles.css",
			expectedCacheValue: "public, max-age=31536000, immutable",
			shouldHaveCache:    true,
		},
		{
			name:               "PNG image in assets",
			path:               "/assets/logo.png",
			expectedCacheValue: "public, max-age=31536000, immutable",
			shouldHaveCache:    true,
		},
		{
			name:               "SVG image in assets",
			path:               "/assets/icon.svg",
			expectedCacheValue: "public, max-age=31536000, immutable",
			shouldHaveCache:    true,
		},
		{
			name:               "WOFF2 font in assets",
			path:               "/assets/font.woff2",
			expectedCacheValue: "public, max-age=31536000, immutable",
			shouldHaveCache:    true,
		},
		{
			name:               "JS file with base path",
			path:               "/kite/assets/bundle.js",
			expectedCacheValue: "public, max-age=31536000, immutable",
			shouldHaveCache:    true,
		},
		{
			name:            "API endpoint should not have cache",
			path:            "/api/v1/pods",
			shouldHaveCache: false,
		},
		{
			name:            "HTML file should not have cache",
			path:            "/index.html",
			shouldHaveCache: false,
		},
		{
			name:            "Root path should not have cache",
			path:            "/",
			shouldHaveCache: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", tc.path, nil)

			// Create a handler chain with our middleware
			middleware := StaticCache()
			middleware(c)

			// Check the Cache-Control header
			cacheControl := w.Header().Get("Cache-Control")

			if tc.shouldHaveCache {
				if cacheControl != tc.expectedCacheValue {
					t.Errorf("Expected Cache-Control header to be %q, got %q", tc.expectedCacheValue, cacheControl)
				}
			} else {
				if cacheControl != "" {
					t.Errorf("Expected no Cache-Control header, but got %q", cacheControl)
				}
			}
		})
	}
}
