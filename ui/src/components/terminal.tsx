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
  const [selectedPod, setSelectedPod] = useState<string>('')
  const [selectedContainer, setSelectedContainer] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [networkSpeed, setNetworkSpeed] = useState({ upload: 0, download: 0 })
  const [terminalTheme, setTerminalTheme] = useState<TerminalTheme>(() => {
    const saved = localStorage.getItem('terminal-theme')
    return (saved as TerminalTheme) || 'classic'
  })
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('log-viewer-font-size')
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
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize pod/container state on props change
  useEffect(() => {
    setSelectedPod(podName || pods?.[0]?.metadata?.name || '')
    setSelectedContainer(containers.length > 0 ? containers[0].name : '')
  }, [podName, pods, containers])

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
      // Delay fit to ensure font size has been applied
      setTimeout(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
        }
      }, 100)
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
    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    }, 200)
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

  const handleContainerChange = useCallback((containerName?: string) => {
    if (containerName) setSelectedContainer(containerName)
  }, [])

  const handlePodChange = useCallback((podName?: string) => {
    setSelectedPod(podName || '')
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

  // Unified terminal and websocket lifecycle
  useEffect(() => {
    if (!pods || pods.length === 0) if (!selectedPod) return
    if (!selectedContainer) return
    if (!terminalRef.current) return

    if (xtermRef.current) xtermRef.current.dispose()
    if (wsRef.current) wsRef.current.close()

    const currentTheme = TERMINAL_THEMES[terminalTheme]
    const terminal = new XTerm({
      fontFamily: '"Maple Mono", Monaco, Menlo, "Ubuntu Mono", monospace',
      fontSize,
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
    const fitAddon = new FitAddon()
    const searchAddon = new SearchAddon()
    const webLinksAddon = new WebLinksAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(searchAddon)
    terminal.loadAddon(webLinksAddon)
    terminal.open(terminalRef.current)
    fitAddon.fit()
    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // Apply additional styles to prevent scroll bubbling
    if (terminal.element) {
      terminal.element.style.overscrollBehavior = 'none'
      terminal.element.style.touchAction = 'none'
      terminal.element.addEventListener(
        'wheel',
        (e) => {
          e.stopPropagation()
          e.preventDefault()
        },
        { passive: false }
      )
    }

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    // WebSocket connection
    setIsConnected(false)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const isDev = process.env.NODE_ENV === 'development'
    const host = isDev ? 'localhost:8080' : window.location.host
    const currentCluster = localStorage.getItem('current-cluster')
    const wsUrl =
      type === 'pod'
        ? `${protocol}//${host}/api/v1/terminal/${namespace}/${selectedPod}/ws?container=${selectedContainer}&x-cluster-name=${currentCluster}`
        : `${protocol}//${host}/api/v1/node-terminal/${namespace}/ws?x-cluster-name=${currentCluster}`
    const websocket = new WebSocket(wsUrl)
    wsRef.current = websocket

    websocket.onopen = () => {
      setIsConnected(true)
      networkStatsRef.current = {
        lastReset: Date.now(),
        bytesReceived: 0,
        bytesSent: 0,
        lastUpdate: Date.now(),
      }
      setNetworkSpeed({ upload: 0, download: 0 })
      if (speedUpdateTimerRef.current)
        clearInterval(speedUpdateTimerRef.current)
      speedUpdateTimerRef.current = setInterval(() => {
        const now = Date.now()
        const stats = networkStatsRef.current
        const timeDiff = (now - stats.lastReset) / 1000
        if (timeDiff > 0) {
          setNetworkSpeed({
            upload: stats.bytesSent / timeDiff,
            download: stats.bytesReceived / timeDiff,
          })
          if (timeDiff >= 3) {
            stats.lastReset = now
            stats.bytesSent = 0
            stats.bytesReceived = 0
          }
        }
      }, 500)

      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
      pingTimerRef.current = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          const pingMessage = JSON.stringify({ type: 'ping' })
          websocket.send(pingMessage)
          updateNetworkStats(new Blob([pingMessage]).size, true)
        }
      }, 30000)

      terminal.writeln(`\x1b[32mConnected to ${type} terminal!\x1b[0m`)
      terminal.writeln('')
    }

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const dataSize = new Blob([event.data]).size
        updateNetworkStats(dataSize, false)
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
            // Ignore pong messages from server
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
      if (speedUpdateTimerRef.current) {
        clearInterval(speedUpdateTimerRef.current)
        speedUpdateTimerRef.current = null
      }
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current)
        pingTimerRef.current = null
      }
      if (event.code !== 1000) {
        terminal.writeln('\x1b[31mConnection closed unexpectedly\x1b[0m')
      } else {
        terminal.writeln('\x1b[32mConnection closed\x1b[0m')
      }
    }

    terminal.onData((data) => {
      if (websocket.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type: 'stdin', data })
        websocket.send(message)
        updateNetworkStats(new Blob([message]).size, true)
      }
    })

    const handleTerminalResize = () => {
      if (fitAddonRef.current && websocket.readyState === WebSocket.OPEN) {
        const { cols, rows } = terminal
        const message = JSON.stringify({ type: 'resize', cols, rows })
        websocket.send(message)
        updateNetworkStats(new Blob([message]).size, true)
      }
    }
    setTimeout(() => handleTerminalResize(), 100)

    let resizeObserver: ResizeObserver | null = null
    if (fitAddonRef.current && terminal.element) {
      resizeObserver = new ResizeObserver(handleTerminalResize)
      resizeObserver.observe(terminal.element)
    }

    const handleWheelEvent = (e: WheelEvent | TouchEvent) => {
      e.stopPropagation()
      e.preventDefault()
    }

    const currentTerminalRef = terminalRef.current
    if (currentTerminalRef) {
      currentTerminalRef.addEventListener('wheel', handleWheelEvent, {
        passive: false,
      })
      currentTerminalRef.addEventListener('touchmove', handleWheelEvent, {
        passive: false,
      })
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (currentTerminalRef) {
        currentTerminalRef.removeEventListener('wheel', handleWheelEvent)
        currentTerminalRef.removeEventListener('touchmove', handleWheelEvent)
      }
      terminal.dispose()
      websocket.close()
      if (speedUpdateTimerRef.current)
        clearInterval(speedUpdateTimerRef.current)
      if (pingTimerRef.current) clearInterval(pingTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPod, selectedContainer, namespace, type, updateNetworkStats])

  // Clear terminal
  const clearTerminal = useCallback(() => {
    if (xtermRef.current) {
      xtermRef.current.clear()
    }
  }, [])

  return (
    <Card
      className={`flex flex-col gap-0 py-2 ${isFullscreen ? 'fixed inset-0 z-50 h-[100dvh]' : 'h-[calc(100dvh-180px)]'}`}
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
                onPodChange={handlePodChange}
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

      <CardContent className="p-0 flex h-full min-h-0">
        <div
          ref={terminalRef}
          className="flex-1 h-full min-h-0"
          style={{
            maxHeight: '100%',
            overflow: 'hidden',
            overscrollBehavior: 'none',
            touchAction: 'none',
            position: 'relative',
            isolation: 'isolate',
          }}
        />
      </CardContent>
    </Card>
  )
}
