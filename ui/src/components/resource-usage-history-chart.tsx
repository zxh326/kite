'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { useResourceUsageHistory } from '@/lib/api'
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
  ChartLegend,
  ChartLegendContent,
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

const chartConfig = {
  usage: {
    label: 'Usage',
  },
  cpu: {
    label: 'CPU',
    color: 'hsl(220, 70%, 50%)',
  },
  memory: {
    label: 'Memory',
    color: 'hsl(142, 70%, 50%)',
  },
} satisfies ChartConfig

interface ResourceUsageHistoryChartProps {
  timeRange: string
  onTimeRangeChange: (value: string) => void
  instance?: string
}

export function ResourceUsageHistoryChart({
  timeRange,
  onTimeRangeChange,
  instance,
}: ResourceUsageHistoryChartProps) {
  const isMobile = useIsMobile()

  // Use the new API hook
  const { data, isLoading, error, isFetching } = useResourceUsageHistory(
    timeRange,
    { instance }
  )

  const chartData = React.useMemo(() => {
    if (!data) return []

    // Combine CPU and Memory data by timestamp
    const combinedData = new Map()

    // Add CPU data
    data.cpu.forEach((point) => {
      const timestamp = new Date(point.timestamp).getTime()
      combinedData.set(timestamp, {
        timestamp: point.timestamp,
        time: timestamp,
        cpu: Math.max(0, Math.min(100, point.value)), // Clamp between 0-100
      })
    })

    // Add Memory data
    data.memory.forEach((point) => {
      const timestamp = new Date(point.timestamp).getTime()
      const existing = combinedData.get(timestamp) || {
        timestamp: point.timestamp,
        time: timestamp,
      }
      existing.memory = Math.max(0, Math.min(100, point.value)) // Clamp between 0-100
      combinedData.set(timestamp, existing)
    })

    // Convert to array and sort by timestamp
    return Array.from(combinedData.values()).sort((a, b) => a.time - b.time)
  }, [data])

  const timeRangeOptions = [
    { value: '30m', label: 'Last 30 min' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
  ]

  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Resource Usage History</CardTitle>
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
      <Card className="@container/card">
        <CardHeader>
          <div className="h-6  bg-muted rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4  bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px]  bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data || (!data.cpu.length && !data.memory.length)) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>
            Real-time resource usage over time
          </CardDescription>{' '}
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
        <CardContent className="px-2 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <div className="text-center">
              <p className="text-sm">No usage data available</p>
              <p className="text-xs">
                Prometheus metrics may not be configured
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Resource Usage
          {isFetching && (
            <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          )}
        </CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Real-time CPU and Memory usage over{' '}
            {timeRangeOptions
              .find((opt) => opt.value === timeRange)
              ?.label.toLowerCase()}
          </span>
          <span className="@[540px]/card:hidden">
            Usage over{' '}
            {timeRangeOptions
              .find((opt) => opt.value === timeRange)
              ?.label.toLowerCase()}
          </span>
        </CardDescription>
        <CardAction>
          <Select
            value={timeRange}
            onValueChange={onTimeRangeChange}
            disabled={isFetching}
          >
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
      <CardContent className="px-2 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
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
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : Math.floor(chartData.length / 2)}
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
            <Area
              dataKey="memory"
              type="natural"
              fill="url(#fillMemory)"
              stroke="var(--color-memory)"
              strokeWidth={2}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
