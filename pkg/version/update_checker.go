package version

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	semver "github.com/blang/semver/v4"
	"k8s.io/klog/v2"
)

const (
	githubLatestReleaseAPI = "https://api.github.com/repos/zxh326/kite/releases/latest"
	versionCheckTimeout    = 3 * time.Second
	versionCacheTTL        = time.Hour
)

var (
	updateInfoMu       sync.Mutex
	cachedUpdateResult = updateCheckResult{}
	lastUpdateFetch    time.Time
)

type githubRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

type updateCheckResult struct {
	hasNew     bool
	releaseURL string
}

func checkForUpdate(ctx context.Context, currentVersion string) updateCheckResult {
	result := updateCheckResult{}

	sanitized := strings.TrimSpace(currentVersion)
	if sanitized == "" || strings.EqualFold(sanitized, "dev") {
		return result
	}

	updateInfoMu.Lock()
	if time.Since(lastUpdateFetch) < versionCacheTTL {
		cached := cachedUpdateResult
		updateInfoMu.Unlock()
		return cached
	}
	updateInfoMu.Unlock()

	requestCtx, cancel := context.WithTimeout(ctx, versionCheckTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(requestCtx, http.MethodGet, githubLatestReleaseAPI, nil)
	if err != nil {
		klog.Warningf("version check request creation failed: %v", err)
		return result
	}

	req.Header.Set("User-Agent", "kite-version-checker/"+currentVersion)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		klog.Warningf("version check request failed: %v", err)
		return result
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		klog.Warningf("version check unexpected status: %s", resp.Status)
		return result
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		klog.Warningf("version check decode failed: %v", err)
		return result
	}

	latestVersion, err := parseSemver(release.TagName)
	if err != nil {
		klog.Warningf("latest version parse failed: %v", err)
		return result
	}

	currentSemver, err := parseSemver(sanitized)
	if err != nil {
		klog.Warningf("current version parse failed: %v", err)
		return result
	}

	if latestVersion.GT(currentSemver) {
		result.hasNew = true
		result.releaseURL = release.HTMLURL
	}

	cacheUpdateResult(result)
	return result
}

func cacheUpdateResult(result updateCheckResult) {
	updateInfoMu.Lock()
	cachedUpdateResult = result
	lastUpdateFetch = time.Now()
	updateInfoMu.Unlock()
}

func parseSemver(version string) (semver.Version, error) {
	trimmed := strings.TrimSpace(version)
	trimmed = strings.TrimPrefix(trimmed, "v")
	if trimmed == "" {
		return semver.Version{}, errors.New("empty version")
	}

	parsed, err := semver.Parse(trimmed)
	if err != nil {
		return semver.Version{}, fmt.Errorf("invalid semver %q: %w", version, err)
	}
	return parsed, nil
}
