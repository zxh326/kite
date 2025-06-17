package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "net/http/pprof"

	"github.com/gin-gonic/gin"
	"github.com/zxh326/kite/pkg/auth"
	"github.com/zxh326/kite/pkg/common"
	"github.com/zxh326/kite/pkg/handlers"
	"github.com/zxh326/kite/pkg/handlers/resources"
	"github.com/zxh326/kite/pkg/kube"
	"github.com/zxh326/kite/pkg/prometheus"
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

func setupAPIRouter(r *gin.Engine, k8sClient *kube.K8sClient, promClient *prometheus.Client) {
	// Health check
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
		authGroup.GET("/login", authHandler.Login)
		authGroup.GET("/callback", authHandler.Callback)
		authGroup.POST("/logout", authHandler.Logout)
		authGroup.POST("/refresh", authHandler.RefreshToken)
		authGroup.GET("/user", authHandler.RequireAuth(), authHandler.GetUser)
	}

	// API routes group (protected)
	api := r.Group("/api/v1")
	api.Use(authHandler.RequireAuth())
	{
		overviewHandler := handlers.NewOverviewHandler(k8sClient, promClient)
		// Register overview routes
		api.GET("/overview", overviewHandler.GetOverview)

		promHandler := handlers.NewPromHandler(promClient)
		// Register Prometheus routes
		api.GET("/prometheus/resource-usage-history", promHandler.GetResourceUsageHistory)

		// Register Pod monitoring routes
		api.GET("/prometheus/pods/:namespace/:podName/metrics", promHandler.GetPodMetrics)

		// Register logs handler
		logsHandler := handlers.NewLogsHandler(k8sClient)
		api.GET("/logs/:namespace/:podName", logsHandler.GetPodLogs)

		// Register terminal handler
		terminalHandler := handlers.NewTerminalHandler(k8sClient)
		api.GET("/terminal/:namespace/:podName/ws", terminalHandler.HandleTerminalWebSocket)

		// Register node terminal handler
		nodeTerminalHandler := handlers.NewNodeTerminalHandler(k8sClient)
		api.GET("/node-terminal/:nodeName/ws", nodeTerminalHandler.HandleNodeTerminalWebSocket)

		// Register search handler
		searchHandler := handlers.NewSearchHandler(k8sClient)
		api.GET("/search", searchHandler.GlobalSearch)

		// Register generic resource handlers
		resources.RegisterRoutes(api, k8sClient)
	}
}

func setupWebhookRouter(r *gin.Engine, k8sClient *kube.K8sClient) {
	// Webhook routes
	webhookGroup := r.Group("/api/v1/webhooks", gin.BasicAuth(gin.Accounts{
		common.WebhookUsername: common.WebhookPassword,
	}))
	{
		webhookHandler := handlers.NewWebhookHandler(k8sClient)
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
	r.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		Formatter: func(param gin.LogFormatterParams) string {
			if param.Path == "/healthz" || strings.HasPrefix(param.Path, "/assets/") || strings.HasPrefix(param.Path, "/favicon.ico") {
				return ""
			}
			// Custom log format
			user, ok := param.Keys["user"].(gin.H)
			name := "-"
			if ok {
				name = user["username"].(string)
				if user["username"] == "" {
					name = user["name"].(string)
				}
			}

			return fmt.Sprintf("%s - %s \"%s %s\" %d %s %s\n",
				param.ClientIP,
				param.TimeStamp.Format("2006-01-02 15:04:05"),
				param.Method,
				param.Path,
				param.StatusCode,
				param.Latency,
				name,
			)
		},
	}))

	// Middleware for CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", c.Request.Header.Get("Origin"))

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	k8sClient, err := kube.NewK8sClient()
	if err != nil {
		log.Fatalf("Failed to create K8s client: %v", err)
	}

	// Try to initialize Prometheus client
	var promClient *prometheus.Client
	if common.PrometheusURL != "" {
		promClient, err = prometheus.NewClient(common.PrometheusURL)
		if err != nil {
			klog.Errorf("Failed to create Prometheus client: %v", err)
			promClient = nil
		}
	}

	// Setup router
	setupAPIRouter(r, k8sClient, promClient)
	setupWebhookRouter(r, k8sClient)
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
