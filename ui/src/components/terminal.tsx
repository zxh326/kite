import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconClearAll,
  IconMaximize,
  IconMinimize,
  IconPalette,
  IconSettings,
  IconTerminal,
} from '@tabler/icons-react'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal as XTerm } from '@xterm/xterm'
import { Pod } from 'kubernetes-types/core/v1'

import '@xterm/xterm/css/xterm.css'

import { SimpleContainer } from '@/types/k8s'
import { TERMINAL_THEMES, TerminalTheme } from '@/types/themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ConnectionIndicator } from './connection-indicator'
import { NetworkSpeedIndicator } from './network-speed-indicator'
import { ContainerSelector } from './selector/container-selector'
import { PodSelector } from './selector/pod-selector'

interface TerminalProps {
  type?: 'node' | 'pod'
  namespace: string
  podName?: string
  pods?: Pod[]
  containers?: SimpleContainer
}

export function Terminal({
  namespace,
  podName,
  pods,
  containers = [],
  type = 'pod',
}: TerminalProps) {
  const [selectedPod, setSelectedPod] = useState<string | undefined>(
    podName || pods?.[0]?.metadata?.name || ''
  )
  const [selectedContainer, setSelectedContainer] = useState<string>(
    containers.length > 0 ? containers[0].name : ''
  )
  const [isConnected, setIsConnected] = useState(false)
  const [networkSpeed, setNetworkSpeed] = useState({ upload: 0, download: 0 })
  const [terminalTheme, setTerminalTheme] = useState<TerminalTheme>(() => {
    const saved = localStorage.getItem('terminal-theme')
    return (saved as TerminalTheme) || 'classic'
  })
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('log-viewer-font-size') // 与 log viewer 共用同一个 key
    return saved ? parseInt(saved, 10) : 14
  })
  const [isFullscreen, setIsFullscreen] = useState(false)

  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const networkStatsRef = useRef({
    lastReset: Date.now(),
    bytesReceived: 0,
    bytesSent: 0,
    lastUpdate: Date.now(),
  })
  const speedUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle theme change and persist to localStorage
  const handleThemeChange = useCallback((theme: TerminalTheme) => {
    setTerminalTheme(theme)
    localStorage.setItem('terminal-theme', theme)
    // Update terminal theme without recreating the instance
    if (xtermRef.current) {
      const currentTheme = TERMINAL_THEMES[theme]
      xtermRef.current.options.theme = {
        background: currentTheme.background,
        foreground: currentTheme.foreground,
        cursor: currentTheme.cursor,
        selectionBackground: currentTheme.selection,
        black: currentTheme.black,
        red: currentTheme.red,
        green: currentTheme.green,
        yellow: currentTheme.yellow,
        blue: currentTheme.blue,
        magenta: currentTheme.magenta,
        cyan: currentTheme.cyan,
        white: currentTheme.white,
        brightBlack: currentTheme.brightBlack,
        brightRed: currentTheme.brightRed,
        brightGreen: currentTheme.brightGreen,
        brightYellow: currentTheme.brightYellow,
        brightBlue: currentTheme.brightBlue,
        brightMagenta: currentTheme.brightMagenta,
        brightCyan: currentTheme.brightCyan,
        brightWhite: currentTheme.brightWhite,
      }
      // Force refresh to apply the new theme
      xtermRef.current.refresh(0, xtermRef.current.rows - 1)
    }
  }, [])

  // Handle font size change and persist to localStorage
  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(size)
    localStorage.setItem('log-viewer-font-size', size.toString()) // 与 log viewer 共用同一个 key
    // Update terminal font size without recreating the instance
    if (xtermRef.current && fitAddonRef.current) {
      xtermRef.current.options.fontSize = size
      // Fit terminal to maintain container size after font change
      setTimeout(() => {
        fitAddonRef.current?.fit()
        // Force refresh to apply the new font size after fitting
        if (xtermRef.current) {
          xtermRef.current.refresh(0, xtermRef.current.rows - 1)
        }
      }, 0)
    }
  }, [])

  // Quick theme cycling function
  const cycleTheme = useCallback(() => {
    const themes = Object.keys(TERMINAL_THEMES) as TerminalTheme[]
    const currentIndex = themes.indexOf(terminalTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    handleThemeChange(themes[nextIndex])
  }, [terminalTheme, handleThemeChange])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v)
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + T to cycle theme
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault()
        cycleTheme()
      }
      // Font size shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        handleFontSizeChange(Math.min(24, fontSize + 1))
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault()
        handleFontSizeChange(Math.max(10, fontSize - 1))
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        handleFontSizeChange(14) // Reset to default font size
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [cycleTheme, fontSize, handleFontSizeChange])

  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit()
      }, 0)
    }
  }, [isFullscreen])

  // Handle container selector change
  const handleContainerChange = useCallback((containerName?: string) => {
    if (containerName) {
      setSelectedContainer(containerName)
    }
  }, [])

  // Calculate network speed
  const updateNetworkStats = useCallback(
    (dataSize: number, isOutgoing: boolean) => {
      const stats = networkStatsRef.current

      if (isOutgoing) {
        stats.bytesSent += dataSize
      } else {
        stats.bytesReceived += dataSize
      }
    },
    []
  )

  // Initialize xterm.js terminal
  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current) return

    // Clean up existing terminal
    if (xtermRef.current) {
      xtermRef.current.dispose()
    }

    // Get current theme configuration at initialization time
    const storedTheme =
      (localStorage.getItem('terminal-theme') as TerminalTheme) || 'classic'
    const currentTheme = TERMINAL_THEMES[storedTheme]

    // Get current font size from localStorage
    const storedFontSize = localStorage.getItem('log-viewer-font-size')
    const currentFontSize = storedFontSize ? parseInt(storedFontSize, 10) : 14

    // Create new terminal instance
    const terminal = new XTerm({
      fontFamily: '"Maple Mono", Monaco, Menlo, "Ubuntu Mono", monospace',
      fontSize: currentFontSize,
      theme: {
        background: currentTheme.background,
        foreground: currentTheme.foreground,
        cursor: currentTheme.cursor,
        selectionBackground: currentTheme.selection,
        black: currentTheme.black,
        red: currentTheme.red,
        green: currentTheme.green,
        yellow: currentTheme.yellow,
        blue: currentTheme.blue,
        magenta: currentTheme.magenta,
        cyan: currentTheme.cyan,
        white: currentTheme.white,
        brightBlack: currentTheme.brightBlack,
        brightRed: currentTheme.brightRed,
        brightGreen: currentTheme.brightGreen,
        brightYellow: currentTheme.brightYellow,
        brightBlue: currentTheme.brightBlue,
        brightMagenta: currentTheme.brightMagenta,
        brightCyan: currentTheme.brightCyan,
        brightWhite: currentTheme.brightWhite,
      },
      cursorBlink: true,
      allowTransparency: true,
      cursorStyle: 'bar',
      scrollback: 10000,
    })

    // Create and attach addons
    const fitAddon = new FitAddon()
    const searchAddon = new SearchAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(searchAddon)
    terminal.loadAddon(webLinksAddon)

    // Open terminal in the DOM
    terminal.open(terminalRef.current)

    // Fit terminal to container
    fitAddon.fit()

    // Store references
    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // Handle resize
    const handleResize = () => {
      fitAddon.fit()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      terminal.dispose()
    }
  }, [])

  // Connect to WebSocket for terminal session
  const connectTerminal = useCallback(async () => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      ws.close()
    }

    if (!xtermRef.current) return

    try {
      const terminal = xtermRef.current

      // Clear terminal and show connection message
      terminal.clear()

      if (type === 'pod') {
        terminal.writeln(
          `\x1b[32mConnecting to ${namespace}/${selectedPod}/${selectedContainer}...\x1b[0m`
        )
      }
      if (type === 'node') {
        terminal.writeln(
          `\x1b[32mWill create a node agent to connect to node terminal...\x1b[0m`
        )
      }

      // Create WebSocket connection to the real backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // In development, use the backend server port directly
      const isDev = process.env.NODE_ENV === 'development'
      const host = isDev ? 'localhost:8080' : window.location.host
      const currentCluster = localStorage.getItem('current-cluster')
      const wsUrl =
        type == 'pod'
          ? `${protocol}//${host}/api/v1/terminal/${namespace}/${selectedPod}/ws?container=${selectedContainer}&x-cluster-name=${currentCluster}`
          : `${protocol}//${host}/api/v1/node-terminal/${namespace}/ws?x-cluster-name=${currentCluster}`

      const websocket = new WebSocket(wsUrl)
      wsRef.current = websocket

      websocket.onopen = () => {
        setIsConnected(true)
        // Reset network stats on new connection
        networkStatsRef.current = {
          lastReset: Date.now(),
          bytesReceived: 0,
          bytesSent: 0,
          lastUpdate: Date.now(),
        }
        setNetworkSpeed({ upload: 0, download: 0 })

        // Start periodic speed update timer
        if (speedUpdateTimerRef.current) {
          clearInterval(speedUpdateTimerRef.current)
        }
        speedUpdateTimerRef.current = setInterval(() => {
          const now = Date.now()
          const stats = networkStatsRef.current
          const timeDiff = (now - stats.lastReset) / 1000

          if (timeDiff > 0) {
            const uploadSpeed = stats.bytesSent / timeDiff
            const downloadSpeed = stats.bytesReceived / timeDiff

            setNetworkSpeed({
              upload: uploadSpeed,
              download: downloadSpeed,
            })

            // Reset counters every 3 seconds
            if (timeDiff >= 3) {
              stats.lastReset = now
              stats.bytesSent = 0
              stats.bytesReceived = 0
            }
          }
        }, 500)

        setInterval(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)

        terminal.writeln(`\x1b[32mConnected to ${type} terminal!\x1b[0m`)
        terminal.writeln('')
      }

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          const dataSize = new Blob([event.data]).size
          updateNetworkStats(dataSize, false) // Incoming data

          switch (message.type) {
            case 'stdout':
            case 'stderr':
              terminal.write(message.data)
              break
            case 'info':
              terminal.writeln(`\x1b[34m${message.data}\x1b[0m`)
              break
            case 'connected':
              terminal.writeln(`\x1b[32m${message.data}\x1b[0m`)
              break
            case 'error':
              terminal.writeln(`\x1b[31mError: ${message.data}\x1b[0m`)
              setIsConnected(false)
              break
            case 'pong':
              // Handle ping/pong for keep-alive
              break
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        terminal.writeln('\x1b[31mWebSocket connection error\x1b[0m')
        setIsConnected(false)
      }

      websocket.onclose = (event) => {
        setIsConnected(false)
        setNetworkSpeed({ upload: 0, download: 0 })

        // Clear speed update timer
        if (speedUpdateTimerRef.current) {
          clearInterval(speedUpdateTimerRef.current)
          speedUpdateTimerRef.current = null
        }

        if (event.code !== 1000) {
          // Not a normal closure
          terminal.writeln('\x1b[31mConnection closed unexpectedly\x1b[0m')
        } else {
          terminal.writeln('\x1b[32mConnection closed\x1b[0m')
        }
      }

      // Handle terminal input
      terminal.onData((data) => {
        if (websocket.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: 'stdin',
            data: data,
          })
          websocket.send(message)
          updateNetworkStats(new Blob([message]).size, true) // Outgoing data
        }
      })

      // Handle terminal resize
      const handleTerminalResize = () => {
        if (fitAddonRef.current && websocket.readyState === WebSocket.OPEN) {
          const { cols, rows } = terminal
          const message = JSON.stringify({
            type: 'resize',
            cols: cols,
            rows: rows,
          })
          websocket.send(message)
          updateNetworkStats(new Blob([message]).size, true) // Outgoing data
        }
      }

      // Send initial size
      setTimeout(() => {
        handleTerminalResize()
      }, 100)

      // Listen for resize events
      if (fitAddonRef.current) {
        // Trigger resize on fit addon changes
        const resizeObserver = new ResizeObserver(handleTerminalResize)
        if (terminal.element) {
          resizeObserver.observe(terminal.element)
        }

        return () => {
          resizeObserver.disconnect()
        }
      }
    } catch (error) {
      console.error('Failed to connect to terminal:', error)
      if (xtermRef.current) {
        xtermRef.current.writeln(`\x1b[31mFailed to connect: ${error}\x1b[0m`)
      }
      setIsConnected(false)
    }
  }, [namespace, selectedPod, selectedContainer, type, updateNetworkStats])

  // Clear terminal
  const clearTerminal = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear()
    }
  }, [])

  // Initialize terminal when component mounts
  useEffect(() => {
    const cleanup = initializeTerminal()
    return cleanup
  }, [initializeTerminal])

  // Connect terminal when container changes
  useEffect(() => {
    if (selectedContainer && xtermRef.current) {
      connectTerminal()
    }
    if (type == 'node' && namespace && xtermRef.current) {
      connectTerminal()
    }
  }, [selectedContainer, connectTerminal, type, namespace])

  // Cleanup on unmount
  useEffect(() => {
    const currentWs = wsRef.current
    const currentTerm = xtermRef.current
    const currentTimer = speedUpdateTimerRef.current

    return () => {
      if (currentWs) {
        currentWs.close()
      }
      if (currentTerm) {
        currentTerm.dispose()
      }
      if (currentTimer) {
        clearInterval(currentTimer)
      }
    }
  }, [])

  useEffect(() => {
    // reset terminal when pods or containers change
    if (xtermRef.current) {
      setSelectedPod(podName || pods?.[0]?.metadata?.name || '')
      setSelectedContainer(containers.length > 0 ? containers[0].name : '')
    }
  }, [
    clearTerminal,
    connectTerminal,
    containers,
    initializeTerminal,
    podName,
    pods,
  ])

  return (
    <Card
      className={`flex flex-col py-4 gap-0 ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none h-[100dvh]' : 'h-[calc(100dvh-180px)]'}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <IconTerminal className="h-5 w-5" />
              Terminal
            </CardTitle>
            <ConnectionIndicator isConnected={isConnected} />
            <NetworkSpeedIndicator
              uploadSpeed={networkSpeed.upload}
              downloadSpeed={networkSpeed.download}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Container Selector */}
            {containers.length > 1 && (
              <ContainerSelector
                containers={containers}
                showAllOption={false}
                selectedContainer={selectedContainer}
                onContainerChange={handleContainerChange}
              />
            )}

            {/* Pod Selector */}
            {pods && pods.length > 0 && (
              <PodSelector
                pods={pods}
                selectedPod={selectedPod}
                onPodChange={(podName) => {
                  setSelectedPod(podName)
                }}
              />
            )}

            {/* Quick Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={cycleTheme}
              title={`Current theme: ${TERMINAL_THEMES[terminalTheme].name} (Ctrl+T to cycle)`}
              className="relative"
            >
              <IconPalette className="h-4 w-4" />
              <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-gray-400"
                style={{
                  backgroundColor: TERMINAL_THEMES[terminalTheme].background,
                }}
              ></div>
            </Button>

            {/* Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconSettings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  {/* Terminal Theme Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="terminal-theme">Terminal Theme</Label>
                      <Select
                        value={terminalTheme}
                        onValueChange={handleThemeChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TERMINAL_THEMES).map(
                            ([key, theme]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full border border-gray-400"
                                    style={{
                                      backgroundColor: theme.background,
                                    }}
                                  ></div>
                                  <span className="text-sm">{theme.name}</span>
                                </div>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Theme Preview */}
                    <div
                      className="p-3 rounded space-y-1"
                      style={{
                        backgroundColor:
                          TERMINAL_THEMES[terminalTheme].background,
                        color: TERMINAL_THEMES[terminalTheme].foreground,
                        fontSize: `${fontSize}px`,
                      }}
                    >
                      <div>
                        <span
                          style={{
                            color: TERMINAL_THEMES[terminalTheme].green,
                          }}
                        >
                          user@pod:~$
                        </span>{' '}
                        ls -la
                      </div>
                      <div
                        style={{ color: TERMINAL_THEMES[terminalTheme].blue }}
                      >
                        drwxr-xr-x 3 user user 4096 Dec 9 10:30 .
                      </div>
                      <div
                        style={{ color: TERMINAL_THEMES[terminalTheme].yellow }}
                      >
                        -rw-r--r-- 1 user user 220 Dec 9 10:30 README.md
                      </div>
                      <div
                        style={{ color: TERMINAL_THEMES[terminalTheme].red }}
                      >
                        -rwx------ 1 user user 1024 Dec 9 10:30 script.sh
                      </div>
                    </div>
                  </div>

                  {/* Font Size Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="font-size">Font Size</Label>
                      <Select
                        value={fontSize.toString()}
                        onValueChange={(value) =>
                          handleFontSizeChange(Number(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10px</SelectItem>
                          <SelectItem value="11">11px</SelectItem>
                          <SelectItem value="12">12px</SelectItem>
                          <SelectItem value="13">13px</SelectItem>
                          <SelectItem value="14">14px</SelectItem>
                          <SelectItem value="15">15px</SelectItem>
                          <SelectItem value="16">16px</SelectItem>
                          <SelectItem value="18">18px</SelectItem>
                          <SelectItem value="20">20px</SelectItem>
                          <SelectItem value="22">22px</SelectItem>
                          <SelectItem value="24">24px</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Keyboard Shortcuts
                    </Label>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Cycle Theme</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                          Ctrl+T
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Increase Font Size</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                          Ctrl++
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Decrease Font Size</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                          Ctrl+-
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Reset Font Size</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                          Ctrl+0
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear Terminal */}
            <Button variant="outline" size="sm" onClick={clearTerminal}>
              <IconClearAll className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <IconMinimize className="h-4 w-4" />
              ) : (
                <IconMaximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex h-full">
        <div
          ref={terminalRef}
          className="flex-1 overflow-auto h-full bg-black"
        />
      </CardContent>
    </Card>
  )
}
