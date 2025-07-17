import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconClearAll,
  IconDownload,
  IconMaximize,
  IconMinimize,
  IconPalette,
  IconSearch,
  IconSettings,
  IconX,
} from '@tabler/icons-react'
import { Pod } from 'kubernetes-types/core/v1'

import { SimpleContainer } from '@/types/k8s'
import { LOG_THEMES, LogTheme } from '@/types/themes'
import { ansiStateToCss, parseAnsi, stripAnsi } from '@/lib/ansi-parser'
import { useLogsStream } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Switch } from '@/components/ui/switch'

import { ConnectionIndicator } from './connection-indicator'
import { NetworkSpeedIndicator } from './network-speed-indicator'
import { ContainerSelector } from './selector/container-selector'
import { PodSelector } from './selector/pod-selector'

interface LogViewerProps {
  namespace: string
  podName?: string
  pods?: Pod[]
  containers: SimpleContainer
  onClose?: () => void
}

export function LogViewer({
  namespace,
  podName,
  pods,
  containers,
  onClose,
}: LogViewerProps) {
  const [selectedContainer, setSelectedContainer] = useState<
    string | undefined
  >(containers.length > 0 ? containers[0].name : '')
  const [tailLines, setTailLines] = useState(100)
  const [timestamps, setTimestamps] = useState(false)
  const [previous, setPrevious] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [follow, setFollow] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [logTheme, setLogTheme] = useState<LogTheme>(() => {
    const saved = localStorage.getItem('log-viewer-theme')
    return (saved as LogTheme) || 'classic'
  })
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [logStartIndex, setLogStartIndex] = useState(0)

  const [selectPodName, setSelectPodName] = useState<string | undefined>(
    podName || pods?.[0]?.metadata?.name || ''
  )

  useEffect(() => {
    if (podName) {
      if (selectPodName !== podName) {
        setSelectPodName(podName)
      }
      return
    }
    if (pods && pods.length > 0) {
      if (
        !selectPodName ||
        !pods.find((p) => p.metadata?.name === selectPodName)
      ) {
        setSelectPodName(pods[0].metadata?.name)
      }
    }
  }, [podName, pods, selectPodName])

  useEffect(() => {
    if (containers.length > 0) {
      setSelectedContainer(containers[0].name)
    }
  }, [containers])

  // Handle theme change and persist to localStorage
  const handleThemeChange = useCallback((theme: LogTheme) => {
    setLogTheme(theme)
    localStorage.setItem('log-viewer-theme', theme)
  }, [])

  // Quick theme cycling function
  const cycleTheme = useCallback(() => {
    const themes = Object.keys(LOG_THEMES) as LogTheme[]
    const currentIndex = themes.indexOf(logTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    handleThemeChange(themes[nextIndex])
  }, [logTheme, handleThemeChange])

  // Optimized auto scroll function
  const scrollToBottom = useCallback(() => {
    if (autoScroll && logContainerRef.current) {
      requestAnimationFrame(() => {
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop =
            logContainerRef.current.scrollHeight
        }
      })
    }
  }, [autoScroll])

  // Use the new streaming logs hook
  const { logs, isLoading, error, isConnected, downloadSpeed } = useLogsStream(
    namespace,
    selectPodName!,
    {
      container: selectedContainer,
      tailLines,
      timestamps,
      previous,
      follow,
      enabled: true,
    }
  )

  const handleClearLogs = useCallback(() => {
    if (logs) {
      setLogStartIndex(logs.length)
    }
  }, [logs])

  // Stop previous stream when critical parameters change
  useEffect(() => {
    // Show reconnecting state when parameters change
    setIsReconnecting(true)

    // Reset reconnecting state when loading stops
    const timer = setTimeout(() => {
      if (!isLoading) {
        setIsReconnecting(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [selectedContainer, tailLines, timestamps, previous, follow, isLoading])

  // Hide reconnecting state when loading completes
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setIsReconnecting(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // Convert logs array to the expected format with useMemo to prevent re-renders
  const logsData = useMemo(
    () => ({
      logs: logs || [],
      container: selectedContainer,
      pod: selectPodName,
      namespace,
    }),
    [logs, selectedContainer, selectPodName, namespace]
  )

  useEffect(() => {
    scrollToBottom()
  }, [logsData.logs.length, scrollToBottom])

  const displayedLogCount = useMemo(
    () => (logsData?.logs?.slice(logStartIndex) || []).length,
    [logsData?.logs, logStartIndex]
  )

  const filteredLogs = useMemo(() => {
    const logsToFilter = logsData?.logs?.slice(logStartIndex) || []
    const logs =
      logsToFilter.filter((line) =>
        searchTerm
          ? stripAnsi(line).toLowerCase().includes(searchTerm.toLowerCase())
          : true
      ) || []

    const maxDisplayLines = 10000
    if (logs.length > maxDisplayLines) {
      return logs.slice(-maxDisplayLines)
    }
    return logs
  }, [logsData?.logs, searchTerm, logStartIndex])

  const downloadLogs = () => {
    if (!logsData?.logs) return

    const content = logsData.logs.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectPodName}-${selectedContainer || 'pod'}-logs.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // Handle ESC key for fullscreen exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        const searchInput = document.querySelector(
          'input[placeholder="Filter logs..."]'
        ) as HTMLInputElement
        searchInput?.focus()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        toggleFullscreen()
      }
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchTerm, isFullscreen, toggleFullscreen])

  return (
    <Card
      className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Logs</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>
                  {filteredLogs?.length || 0} lines
                  {searchTerm && ` (filtered from ${displayedLogCount || 0})`}
                  {logsData?.logs && logsData.logs.length > 10000 && (
                    <span className="text-yellow-600 ml-1">
                      (showing last 10k lines)
                    </span>
                  )}
                </span>
                <ConnectionIndicator isConnected={isConnected} />
                <NetworkSpeedIndicator
                  downloadSpeed={downloadSpeed}
                  uploadSpeed={0}
                />
                {isLoading && <span>Loading...</span>}
                {isReconnecting && (
                  <span className="text-blue-600">Reconnecting...</span>
                )}
                {error && (
                  <span className="text-red-600">
                    Error:{' '}
                    {error instanceof Error ? error.message : 'Unknown error'}
                  </span>
                )}
              </div>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-48"
              />
            </div>

            {/* Container Selector */}
            {containers.length > 1 && (
              <ContainerSelector
                containers={containers}
                showAllOption={false}
                selectedContainer={selectedContainer}
                onContainerChange={setSelectedContainer}
              />
            )}

            {/* Pod Selector */}
            {pods && (
              <PodSelector
                pods={pods.sort((a, b) =>
                  (a.metadata?.creationTimestamp || 0) >
                  (b.metadata?.creationTimestamp || 0)
                    ? -1
                    : 1
                )}
                showAllOption={false}
                selectedPod={selectPodName}
                onPodChange={setSelectPodName}
              />
            )}

            {/* Quick Theme Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={cycleTheme}
              title={`Current theme: ${LOG_THEMES[logTheme].name}`}
              className="relative"
            >
              <IconPalette className="h-4 w-4" />
              <div
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${LOG_THEMES[logTheme].bg} border border-gray-400`}
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tail-lines">Tail Lines</Label>
                    <Select
                      value={tailLines.toString()}
                      onValueChange={(value) => setTailLines(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                        <SelectItem value="1000">1000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="timestamps">Show Timestamps</Label>
                    <Switch
                      id="timestamps"
                      checked={timestamps}
                      onCheckedChange={setTimestamps}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="follow">Follow Logs (Real-time)</Label>
                    <Switch
                      id="follow"
                      checked={follow}
                      onCheckedChange={setFollow}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="previous">Previous Container</Label>
                    <Switch
                      id="previous"
                      checked={previous}
                      onCheckedChange={setPrevious}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-scroll">Auto Scroll</Label>
                    <Switch
                      id="auto-scroll"
                      checked={autoScroll}
                      onCheckedChange={setAutoScroll}
                    />
                  </div>

                  {/* Log Theme Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="log-theme">Log Theme</Label>
                      <Select
                        value={logTheme}
                        onValueChange={handleThemeChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LOG_THEMES).map(([key, theme]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${theme.bg} border border-gray-400`}
                                ></div>
                                <span
                                  className={`${theme.text === 'text-gray-800' ? 'text-gray-600' : theme.text}`}
                                >
                                  {theme.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Theme Preview */}
                    <div
                      className={`${LOG_THEMES[logTheme].bg} ${LOG_THEMES[logTheme].text} p-2 rounded text-xs space-y-1`}
                    >
                      <div>
                        2024-12-09T10:30:15Z INFO Starting application...
                      </div>
                      <div className={LOG_THEMES[logTheme].warning}>
                        2024-12-09T10:30:16Z WARN Configuration file not found
                      </div>
                      <div className={LOG_THEMES[logTheme].error}>
                        2024-12-09T10:30:17Z ERROR Failed to connect to database
                      </div>
                      <div className={LOG_THEMES[logTheme].accent}>
                        2024-12-09T10:30:18Z DEBUG Connection retry attempt
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Keyboard Shortcuts
                    </Label>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Focus Search</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                          Ctrl+F
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Clear Search</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                          ESC
                        </kbd>
                      </div>
                      <div className="flex justify-between">
                        <span>Toggle Fullscreen</span>
                        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">
                          Ctrl+Enter
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Clear Logs */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearLogs}
              title="Clear logs"
            >
              <IconClearAll className="h-4 w-4" />
            </Button>

            {/* Download */}
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              disabled={!logsData?.logs?.length}
            >
              <IconDownload className="h-4 w-4" />
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              title={
                isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'
              }
            >
              {isFullscreen ? (
                <IconMinimize className="h-4 w-4" />
              ) : (
                <IconMaximize className="h-4 w-4" />
              )}
            </Button>

            {/* Close */}
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <IconX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <div
          ref={logContainerRef}
          className={`h-full overflow-auto ${LOG_THEMES[logTheme].bg} ${LOG_THEMES[logTheme].text} text-sm ${isFullscreen ? 'px-0' : 'px-4'} space-y-1`}
          style={{
            height: isFullscreen ? 'calc(100dvh)' : 'calc(100dvh - 340px)',
          }}
        >
          {isLoading && !logsData && (
            <div className="text-center opacity-60">Loading logs...</div>
          )}

          {error && (
            <div className={`text-center ${LOG_THEMES[logTheme].error}`}>
              Failed to load logs:{' '}
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          )}

          {filteredLogs?.length === 0 && !isLoading && (
            <div className="text-center opacity-60">
              {searchTerm ? 'No logs match your search' : 'No logs available'}
            </div>
          )}

          {filteredLogs?.map((line, index) => {
            const segments = parseAnsi(line)
            return (
              <div key={index} className="break-all">
                {segments.map((segment, segIndex) => (
                  <span key={segIndex} style={ansiStateToCss(segment.styles)}>
                    {segment.text}
                  </span>
                ))}
              </div>
            )
          })}

          {!autoScroll && (
            <div
              className={`sticky bottom-0 flex justify-between items-center ${
                logTheme === 'github'
                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                  : 'bg-yellow-900/80 text-yellow-300'
              } px-2 py-1 text-xs rounded`}
            >
              <span>Auto-scroll disabled. Scroll to bottom to re-enable.</span>
              <Button
                size="sm"
                variant="ghost"
                className={`h-6 px-2 ${
                  logTheme === 'github'
                    ? 'text-orange-800 hover:bg-orange-200'
                    : 'text-yellow-300 hover:bg-yellow-800/50'
                }`}
                onClick={() => {
                  if (logContainerRef.current) {
                    logContainerRef.current.scrollTop =
                      logContainerRef.current.scrollHeight
                    setAutoScroll(true)
                  }
                }}
              >
                Jump to bottom
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
