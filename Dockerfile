FROM node:20-alpine AS frontend-builder

WORKDIR /app/ui

COPY ui/package.json ui/pnpm-lock.yaml ./

RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

COPY ui/ ./
RUN pnpm run build

FROM golang:1.24-alpine AS backend-builder

ARG VERSION=dev
ARG BUILD_DATE=unknown
ARG COMMIT_ID=unknown

WORKDIR /app

COPY go.mod ./
COPY go.sum ./

RUN go mod download

COPY . .

COPY --from=frontend-builder /app/static ./static
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X github.com/zxh326/kite/pkg/version.Version=${VERSION} -X github.com/zxh326/kite/pkg/version.BuildDate=${BUILD_DATE} -X github.com/zxh326/kite/pkg/version.CommitID=${COMMIT_ID}" -o kite .

FROM gcr.io/distroless/static

WORKDIR /app

COPY --from=backend-builder /app/kite .

EXPOSE 8080

CMD ["./kite"]
