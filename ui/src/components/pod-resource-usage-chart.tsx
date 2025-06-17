'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { usePodMetrics } from '@/lib/api'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const cpuChartConfig = {
  cpu: {
    label: 'CPU (cores)',
    color: 'hsl(220, 70%, 50%)',
  },
} satisfies ChartConfig

interface PodResourceUsageChartProps {
  namespace: string
  podName: string
  timeRange: string
  onTimeRangeChange: (value: string) => void
  container?: string | null
  refreshInterval?: string
}

export function PodResourceUsageChart({
  namespace,
  podName,
  timeRange,
  onTimeRangeChange,
  container,
  refreshInterval = '30s',
}: PodResourceUsageChartProps) {
  const isMobile = useIsMobile()

  // Use the container metrics API with optional container parameter
  const { data, isLoading, error, isFetching } = usePodMetrics(
    namespace,
    podName,
    timeRange,
    {
      container: container ?? undefined,
      refreshInterval: refreshInterval,
    }
  )

  const cpuChartData = React.useMemo(() => {
    if (!data?.cpu) return []

    return data.cpu
      .map((point) => ({
        timestamp: point.timestamp,
        time: new Date(point.timestamp).getTime(),
        cpu: Math.max(0, point.value), // CPU value is already in cores
      }))
      .sort((a, b) => a.time - b.time)
  }, [data?.cpu])

  const memoryChartData = React.useMemo(() => {
    if (!data?.memory) return []

    return data.memory
      .map((point) => ({
        timestamp: point.timestamp,
        time: new Date(point.timestamp).getTime(),
        memory: Math.max(0, point.value), // Memory is already in MB
      }))
      .sort((a, b) => a.time - b.time)
  }, [data?.memory])

  // Determine if we should use GB instead of MB
  const useGB = React.useMemo(() => {
    if (!memoryChartData.length) return false
    const maxMemory = Math.max(...memoryChartData.map((point) => point.memory))
    return maxMemory > 1024
  }, [memoryChartData])

  // Convert memory data to GB if needed
  const processedMemoryChartData = React.useMemo(() => {
    if (!useGB) return memoryChartData
    return memoryChartData.map((point) => ({
      ...point,
      memory: point.memory / 1024, // Convert MB to GB
    }))
  }, [memoryChartData, useGB])

  // Dynamic memory chart config based on unit
  const dynamicMemoryChartConfig = React.useMemo(
    () => ({
      memory: {
        label: `Memory (${useGB ? 'GB' : 'MB'})`,
        color: 'hsl(142, 70%, 50%)',
      },
    }),
    [useGB]
  )

  const timeRangeOptions = [
    { value: '30m', label: 'Last 30 min' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
  ]

  const titlePrefix = container ? `Container "${container}"` : ''

  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>{titlePrefix} Resource Usage</CardTitle>
          <CardDescription>Failed to load usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : 'Unknown error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <Card className="@container/card">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <div className="h-[250px] bg-muted rounded animate-pulse"></div>
          </CardContent>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <div className="h-[250px] bg-muted rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || (!data.cpu?.length && !data.memory?.length)) {
    return (
      <div className="space-y-6">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>{titlePrefix} CPU Usage</CardTitle>
            <CardDescription>Real-time CPU usage over time</CardDescription>
            <CardAction>
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger
                  className="w-40"
                  size="sm"
                  aria-label="Select time range"
                >
                  <SelectValue placeholder="Last 1 hour" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {timeRangeOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">No CPU usage data available</p>
                <p className="text-xs">
                  Prometheus metrics may not be configured
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>{titlePrefix} Memory Usage</CardTitle>
            <CardDescription>Real-time memory usage over time</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              <div className="text-center">
                <p className="text-sm">No memory usage data available</p>
                <p className="text-xs">
                  Prometheus metrics may not be configured
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {data.cpu?.length > 0 && (
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {titlePrefix} CPU Usage
              {isFetching && (
                <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={cpuChartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={cpuChartData}>
                <defs>
                  <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-cpu)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-cpu)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}`}
                />
                <ChartTooltip
                  cursor={false}
                  defaultIndex={
                    isMobile ? -1 : Math.floor(cpuChartData.length / 2)
                  }
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      }}
                      indicator="dot"
                      formatter={(value) => [
                        `${Number(value).toFixed(3)} cores`,
                      ]}
                    />
                  }
                />
                <Area
                  dataKey="cpu"
                  type="natural"
                  fill="url(#fillCpu)"
                  stroke="var(--color-cpu)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Memory Chart */}
      {data.memory?.length > 0 && (
        <Card className="@container/card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {titlePrefix} Memory Usage
              {isFetching && (
                <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={dynamicMemoryChartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={processedMemoryChartData}>
                <defs>
                  <linearGradient id="fillMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-memory)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-memory)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value} ${useGB ? 'GB' : 'MB'}`}
                />
                <ChartTooltip
                  cursor={false}
                  defaultIndex={
                    isMobile
                      ? -1
                      : Math.floor(processedMemoryChartData.length / 2)
                  }
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      }}
                      indicator="dot"
                      formatter={(value) => [
                        `${Number(value).toFixed(useGB ? 2 : 0)} ${useGB ? 'GB' : 'MB'}`,
                      ]}
                    />
                  }
                />
                <Area
                  dataKey="memory"
                  type="natural"
                  fill="url(#fillMemory)"
                  stroke="var(--color-memory)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
