package version

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

var (
	Version   = "dev"
	BuildDate = "unknown"
	CommitID  = "unknown"
)

type VersionInfo struct {
	Version   string `json:"version"`
	BuildDate string `json:"buildDate"`
	CommitID  string `json:"commitId"`
}

func GetVersion(c *gin.Context) {
	versionInfo := VersionInfo{
		Version:   Version,
		BuildDate: BuildDate,
		CommitID:  CommitID,
	}

	c.JSON(http.StatusOK, versionInfo)
}
