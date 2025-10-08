import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface WebSocketOptions {
  enabled?: boolean
  pingInterval?: number
  speedUpdateInterval?: number
  speedResetInterval?: number
  reconnectOnClose?: boolean
  maxReconnectAttempts?: number
  reconnectInterval?: number
}

export interface WebSocketMessage {
  type: string
  data?: string
  [key: string]: unknown
}

export interface WebSocketCallbacks {
  onMessage?: (message: WebSocketMessage) => void
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (error: Event) => void
}

export interface NetworkStats {
  uploadSpeed: number
  downloadSpeed: number
  totalUploaded: number
  totalDownloaded: number
}

export interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: Error | null
  networkStats: NetworkStats
}

export interface WebSocketActions {
  send: (message: WebSocketMessage | string) => boolean
  disconnect: () => void
  reconnect: () => void
}

const defaultOptions: Required<WebSocketOptions> = {
  enabled: true,
  pingInterval: 30000,
  speedUpdateInterval: 500,
  speedResetInterval: 3000,
  reconnectOnClose: false,
  maxReconnectAttempts: 3,
  reconnectInterval: 5000,
}

export function useWebSocket(
  url: string | (() => string),
  callbacks: WebSocketCallbacks = {},
  options: WebSocketOptions = {}
): [WebSocketState, WebSocketActions] {
  const opts = useMemo(() => ({ ...defaultOptions, ...options }), [options])

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    uploadSpeed: 0,
    downloadSpeed: 0,
    totalUploaded: 0,
    totalDownloaded: 0,
  })

  // Refs for WebSocket and timers
  const wsRef = useRef<WebSocket | null>(null)
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const speedUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)

  // Network stats tracking
  const networkStatsRef = useRef({
    lastReset: Date.now(),
    bytesUploaded: 0,
    bytesDownloaded: 0,
    totalUploaded: 0,
    totalDownloaded: 0,
  })

  // Update network stats
  const updateNetworkStats = useCallback((bytes: number, isSent: boolean) => {
    const stats = networkStatsRef.current
    if (isSent) {
      stats.bytesUploaded += bytes
      stats.totalUploaded += bytes
    } else {
      stats.bytesDownloaded += bytes
      stats.totalDownloaded += bytes
    }
  }, [])

  // Clean up all resources
  const cleanupResources = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.onmessage = null
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close()
      }
      wsRef.current = null
    }

    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current)
      pingTimerRef.current = null
    }

    if (speedUpdateTimerRef.current) {
      clearInterval(speedUpdateTimerRef.current)
      speedUpdateTimerRef.current = null
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  // Start speed update timer
  const startSpeedUpdateTimer = useCallback(() => {
    if (speedUpdateTimerRef.current) return

    speedUpdateTimerRef.current = setInterval(() => {
      if (!isMountedRef.current) return

      const now = Date.now()
      const stats = networkStatsRef.current
      const timeDiff = (now - stats.lastReset) / 1000

      if (timeDiff > 0) {
        const uploadSpeed = stats.bytesUploaded / timeDiff
        const downloadSpeed = stats.bytesDownloaded / timeDiff

        setNetworkStats((prev) => {
          if (
            prev.uploadSpeed === uploadSpeed &&
            prev.downloadSpeed === downloadSpeed &&
            prev.totalUploaded === stats.totalUploaded &&
            prev.totalDownloaded === stats.totalDownloaded
          ) {
            return prev
          }

          prev.uploadSpeed = uploadSpeed
          prev.downloadSpeed = downloadSpeed
          prev.totalUploaded = stats.totalUploaded
          prev.totalDownloaded = stats.totalDownloaded
          return prev
        })

        // Reset counters after specified interval
        const currentOpts = optsRef.current
        if (timeDiff >= currentOpts.speedResetInterval / 1000) {
          stats.lastReset = now
          stats.bytesUploaded = 0
          stats.bytesDownloaded = 0
        }
      }
    }, optsRef.current.speedUpdateInterval)
  }, [])

  // Start ping timer
  const startPingTimer = useCallback(() => {
    if (pingTimerRef.current) return

    pingTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const pingMessage = JSON.stringify({ type: 'ping' })
        wsRef.current.send(pingMessage)
        updateNetworkStats(new Blob([pingMessage]).size, true)
      }
    }, optsRef.current.pingInterval)
  }, [updateNetworkStats])

  // Store callbacks in refs to avoid recreating connect function
  const callbacksRef = useRef(callbacks)
  const optsRef = useRef(opts)
  callbacksRef.current = callbacks
  optsRef.current = opts

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      return // Already connecting
    }

    cleanupResources()

    const wsUrl = typeof url === 'function' ? url() : url
    const currentOpts = optsRef.current
    if (!wsUrl || !currentOpts.enabled) return

    try {
      setIsConnecting(true)
      setError(null)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        if (!isMountedRef.current) return

        console.log('WebSocket connected to:', wsUrl)
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        reconnectAttemptsRef.current = 0

        // Reset network stats
        networkStatsRef.current = {
          lastReset: Date.now(),
          bytesUploaded: 0,
          bytesDownloaded: 0,
          totalUploaded: networkStatsRef.current.totalUploaded,
          totalDownloaded: networkStatsRef.current.totalDownloaded,
        }

        // Start timers
        startSpeedUpdateTimer()
        startPingTimer()

        callbacksRef.current.onOpen?.()
      }

      ws.onclose = (event) => {
        if (!isMountedRef.current) return

        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)

        // Clean up timers
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current)
          pingTimerRef.current = null
        }
        if (speedUpdateTimerRef.current) {
          clearInterval(speedUpdateTimerRef.current)
          speedUpdateTimerRef.current = null
        }

        setNetworkStats((prev) => {
          if (prev.uploadSpeed === 0 && prev.downloadSpeed === 0) return prev
          return {
            ...prev,
            uploadSpeed: 0,
            downloadSpeed: 0,
          }
        })

        callbacksRef.current.onClose?.(event)

        // Handle reconnection
        const currentOptsForReconnect = optsRef.current
        if (
          currentOptsForReconnect.reconnectOnClose &&
          event.code !== 1000 &&
          reconnectAttemptsRef.current <
            currentOptsForReconnect.maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++
          reconnectTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              console.log(
                `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${currentOptsForReconnect.maxReconnectAttempts})`
              )
              connect()
            }
          }, currentOptsForReconnect.reconnectInterval)
        }
      }

      ws.onerror = (event) => {
        if (!isMountedRef.current) return

        console.error('WebSocket error:', event)
        const wsError = new Error('WebSocket connection error')
        setError(wsError)
        setIsConnecting(false)
        callbacksRef.current.onError?.(event)
      }

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return

        try {
          // Track download bytes
          const dataSize = new Blob([event.data]).size
          updateNetworkStats(dataSize, false)

          // Parse message
          let message: WebSocketMessage
          try {
            message = JSON.parse(event.data)
          } catch {
            // If not JSON, treat as plain text message
            message = { type: 'data', data: event.data }
          }

          // Handle internal message types
          if (message.type === 'pong') {
            return // Ignore pong responses
          }

          callbacksRef.current.onMessage?.(message)
        } catch (err) {
          console.error('Error processing WebSocket message:', err)
        }
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setError(
        err instanceof Error ? err : new Error('Failed to create WebSocket')
      )
      setIsConnecting(false)
    }
  }, [
    url,
    cleanupResources,
    startSpeedUpdateTimer,
    startPingTimer,
    updateNetworkStats,
  ])

  // Send message
  const send = useCallback(
    (message: WebSocketMessage | string): boolean => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket is not connected')
        return false
      }

      try {
        const data =
          typeof message === 'string' ? message : JSON.stringify(message)
        wsRef.current.send(data)
        updateNetworkStats(new Blob([data]).size, true)
        return true
      } catch (err) {
        console.error('Failed to send WebSocket message:', err)
        return false
      }
    },
    [updateNetworkStats]
  )

  // Disconnect
  const disconnect = useCallback(() => {
    reconnectAttemptsRef.current = optsRef.current.maxReconnectAttempts // Prevent reconnection
    cleanupResources()
    setIsConnected(false)
    setIsConnecting(false)
  }, [cleanupResources])

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  // Main effect for connection lifecycle
  useEffect(() => {
    isMountedRef.current = true

    if (optsRef.current.enabled) {
      // Add a small delay to prevent rapid reconnections
      const timer = setTimeout(() => {
        if (isMountedRef.current && optsRef.current.enabled) {
          connect()
        }
      }, 100)

      return () => {
        clearTimeout(timer)
      }
    }

    return () => {
      isMountedRef.current = false
      cleanupResources()
    }
  }, [connect, cleanupResources])

  // Effect to handle enabled option changes
  useEffect(() => {
    if (opts.enabled && !isConnected && !isConnecting) {
      const timer = setTimeout(() => {
        if (opts.enabled && !isConnected && !isConnecting) {
          connect()
        }
      }, 100)
      return () => clearTimeout(timer)
    } else if (!opts.enabled && (isConnected || isConnecting)) {
      cleanupResources()
      setIsConnected(false)
      setIsConnecting(false)
    }
  }, [opts.enabled, isConnected, isConnecting, connect, cleanupResources])

  // Return state and actions
  return [
    {
      isConnected,
      isConnecting,
      error,
      networkStats,
    },
    {
      send,
      disconnect,
      reconnect,
    },
  ]
}

export default useWebSocket
