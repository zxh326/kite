package main

import (
	"context"
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "net/http/pprof"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/auth"
	"github.com/zxh326/kite/pkg/cluster"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/handlers"
	"github.com/zxh326/kite/pkg/handlers/resources"
	"github.com/zxh326/kite/pkg/middleware"
	"github.com/zxh326/kite/pkg/utils"
	"k8s.io/klog/v2"
)

//go:embed static
var static embed.FS

func setupStatic(r *gin.Engine) {
	assertsFS, err := fs.Sub(static, "static/assets")
	if err != nil {
		panic(err)
	}
	r.StaticFS("/assets", http.FS(assertsFS))
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if len(path) >= 5 && path[:5] == "/api/" {
			c.JSON(http.StatusNotFound, gin.H{"error": "API endpoint not found"})
			return
		}

		content, err := static.ReadFile("static/index.html")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read index.html"})
			return
		}

		htmlContent := string(content)
		if common.EnableAnalytics {
			// Inject analytics if enabled
			htmlContent = utils.InjectAnalytics(string(content))
		}

		// Set content type and serve modified HTML
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, htmlContent)
	})
}

func setupAPIRouter(r *gin.Engine, cm *cluster.ClusterManager) {
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// Auth routes (no auth required)
	authHandler := auth.NewAuthHandler()
	authGroup := r.Group("/api/auth")
	{
		authGroup.GET("/providers", authHandler.GetProviders)
		authGroup.POST("/login/password", authHandler.PasswordLogin)
		authGroup.GET("/login", authHandler.Login)
		authGroup.GET("/callback", authHandler.Callback)
		authGroup.POST("/logout", authHandler.Logout)
		authGroup.POST("/refresh", authHandler.RefreshToken)
		authGroup.GET("/user", authHandler.RequireAuth(), authHandler.GetUser)
	}

	// API routes group (protected)
	api := r.Group("/api/v1")
	api.Use(authHandler.RequireAuth(), middleware.ClusterMiddleware(cm), middleware.ReadonlyMiddleware())
	{
		api.GET("/overview", handlers.GetOverview)
		api.GET("/clusters", cm.GetClusters)

		promHandler := handlers.NewPromHandler()
		api.GET("/prometheus/resource-usage-history", promHandler.GetResourceUsageHistory)
		api.GET("/prometheus/pods/:namespace/:podName/metrics", promHandler.GetPodMetrics)

		logsHandler := handlers.NewLogsHandler()
		api.GET("/logs/:namespace/:podName", logsHandler.GetPodLogs)

		terminalHandler := handlers.NewTerminalHandler()
		api.GET("/terminal/:namespace/:podName/ws", terminalHandler.HandleTerminalWebSocket)

		nodeTerminalHandler := handlers.NewNodeTerminalHandler()
		api.GET("/node-terminal/:nodeName/ws", nodeTerminalHandler.HandleNodeTerminalWebSocket)

		searchHandler := handlers.NewSearchHandler()
		api.GET("/search", searchHandler.GlobalSearch)

		resourceApplyHandler := handlers.NewResourceApplyHandler()
		api.POST("/resources/apply", resourceApplyHandler.ApplyResource)

		api.GET("/image/tags", handlers.GetImageTags)

		resources.RegisterRoutes(api)
	}
}

func setupWebhookRouter(r *gin.Engine, cm *cluster.ClusterManager) {
	if !common.WebhookEnabled {
		klog.Info("Webhook is not enabled, skipping webhook routes setup")
		return
	}
	webhookGroup := r.Group("/api/v1/webhooks", gin.BasicAuth(gin.Accounts{
		common.WebhookUsername: common.WebhookPassword,
	}), middleware.ClusterMiddleware(cm))
	{
		webhookHandler := handlers.NewWebhookHandler(cm)
		webhookGroup.POST("/events", webhookHandler.HandleWebhook)
	}
}

func main() {
	klog.InitFlags(nil)
	flag.Parse()
	go func() {
		log.Println(http.ListenAndServe("localhost:6060", nil))
	}()

	common.LoadEnvs()
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())

	cm, err := cluster.NewClusterManager()
	if err != nil {
		log.Fatalf("Failed to create ClusterManager: %v", err)
	}

	// Setup router
	setupAPIRouter(r, cm)
	setupWebhookRouter(r, cm)
	setupStatic(r)

	srv := &http.Server{
		Addr:    ":" + common.Port,
		Handler: r.Handler(),
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			klog.Fatalf("Failed to start server: %v", err)
		}
	}()
	klog.Infof("Kite server started on port %s", common.Port)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	klog.Info("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		klog.Fatalf("Failed to shutdown server: %v", err)
	}
}
