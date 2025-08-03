# Makefile for Kite project
.PHONY: help dev build clean test docker-build docker-run frontend backend install deps

# Variables
BINARY_NAME=kite
UI_DIR=ui
DOCKER_IMAGE=kite
DOCKER_TAG=latest

# Default target
.DEFAULT_GOAL := help
DOCKER_TAG=latest

LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)
GOLANGCI_LINT = $(LOCALBIN)/golangci-lint

# Help target
help: ## Show this help message
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Install dependencies
install: deps ## Install all dependencies
	@echo "📦 Installing dependencies..."

deps: ## Install frontend and backend dependencies
	@echo "📦 Installing frontend dependencies..."
	cd $(UI_DIR) && pnpm install
	@echo "📦 Installing backend dependencies..."
	go mod download

# Build targets
build: frontend backend ## Build both frontend and backend
	@echo "✅ Build completed successfully!"
	@echo "🚀 Run './$(BINARY_NAME)' to start the server"

cross-compile: frontend ## Cross-compile for multiple architectures
	@echo "🔄 Cross-compiling for multiple architectures..."
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BINARY_NAME)-amd64 .
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BINARY_NAME)-arm64 .

frontend: ## Build frontend only
	@echo "📦 Building frontend..."
	cd $(UI_DIR) && npm run build

backend: ## Build backend only
	@echo "🏗️ Building backend..."
	CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o $(BINARY_NAME) .

# Production targets
run: backend ## Run the built application
	@echo "🚀 Starting $(BINARY_NAME) server..."
	./$(BINARY_NAME)

dev: ## Run in development mode
	@echo "🔄 Starting development mode..."
	@echo "🏗️ Building backend..."
	go build -o $(BINARY_NAME) .
	@echo "🚀 Starting $(BINARY_NAME) server..."
	./$(BINARY_NAME) -v=5 & \
	BACKEND_PID=$$!; \
	echo "Backend PID: $$BACKEND_PID"; \
	trap 'echo "🛑 Stopping backend server..."; kill $$BACKEND_PID 2>/dev/null; exit' INT TERM; \
	echo "🔄 Starting development server..."; \
	cd $(UI_DIR) && pnpm run dev; \
	echo "🛑 Stopping backend server..."; \
	kill $$BACKEND_PID 2>/dev/null

lint: golangci-lint ## Run linters
	@echo "🔍 Running linters..."
	@echo "Backend linting..."
	go vet ./...
	$(GOLANGCI_LINT) run
	@echo "Frontend linting..."
	cd $(UI_DIR) && pnpm run lint

golangci-lint: $(GOLANGCI_LINT) ## Download golangci-lint locally if necessary.
$(GOLANGCI_LINT): $(LOCALBIN)
	$(call go-install-tool,$(GOLANGCI_LINT),github.com/golangci/golangci-lint/v2/cmd/golangci-lint,v2.1.6)

format: ## Format code
	@echo "✨ Formatting code..."
	go fmt ./...
	cd $(UI_DIR) && pnpm run format

# Pre-commit checks
pre-commit: format lint ## Run pre-commit checks
	@echo "✅ Pre-commit checks completed!"

test: ## Run tests
	@echo "🧪 Running tests..."
	go test -v ./...

docs-dev: ## Start documentation server in development mode
	@echo "📚 Starting documentation server..."
	cd docs && pnpm run docs:dev
docs-build: ## Build documentation
	@echo "📚 Building documentation..."
	cd docs && pnpm run docs:build

define go-install-tool
@[ -f "$(1)-$(3)" ] || { \
set -e; \
package=$(2)@$(3) ;\
echo "Downloading $${package}" ;\
rm -f $(1) || true ;\
GOBIN=$(LOCALBIN) go install $${package} ;\
mv $(1) $(1)-$(3) ;\
} ;\
ln -sf $(1)-$(3) $(1)
endef
