'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import { useResourceUsageHistory } from '@/lib/api'
import { formatDate } from '@/lib/utils'
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
    label: 'Network Usage',
  },
  networkIn: {
    label: 'Incoming',
    color: 'oklch(0.55 0.20 145)', // Updated green color to match theme
  },
  networkOut: {
    label: 'Outgoing',
    color: 'oklch(0.55 0.22 235)', // Updated blue color to match theme
  },
} satisfies ChartConfig

interface NetworkUsageChartProps {
  timeRange: string
  onTimeRangeChange: (value: string) => void
  instance?: string
}

// Format bytes to human readable format
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0'

  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const value = bytes / Math.pow(k, i)
  return value >= 10
    ? Math.round(value) + sizes[i]
    : value.toFixed(1) + sizes[i]
}

export function NetworkUsageChart({
  timeRange,
  instance,
  onTimeRangeChange,
}: NetworkUsageChartProps) {
  // Use the existing API hook to get network data
  const { data, isLoading, error, isFetching } = useResourceUsageHistory(
    timeRange,
    { instance }
  )

  const chartData = React.useMemo(() => {
    if (!data || !data.networkIn || !data.networkOut) return []

    // Combine NetworkIn and NetworkOut data by timestamp
    const combinedData = new Map()

    // Add NetworkIn data (as negative values to display below X-axis)
    data.networkIn.forEach((point) => {
      const timestamp = new Date(point.timestamp).getTime()
      combinedData.set(timestamp, {
        timestamp: point.timestamp,
        time: timestamp,
        networkIn: -Math.max(0, point.value), // Convert to negative for below X-axis
      })
    })

    // Add NetworkOut data (positive values for above X-axis)
    data.networkOut.forEach((point) => {
      const timestamp = new Date(point.timestamp).getTime()
      const existing = combinedData.get(timestamp) || {
        timestamp: point.timestamp,
        time: timestamp,
      }
      existing.networkOut = Math.max(0, point.value) // Positive values for above X-axis
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
          <CardTitle className="flex items-center gap-2">
            Network Usage
          </CardTitle>
          <CardDescription>Failed to load network data</CardDescription>
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
          <div className="flex items-center gap-2">
            <div className="h-6  bg-muted rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="h-4  bg-muted rounded w-1/2 animate-pulse"></div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="h-[250px]  bg-muted rounded animate-pulse"></div>
        </CardContent>
      </Card>
    )
  }

  if (!data || (!data.networkIn?.length && !data.networkOut?.length)) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Network Usage
          </CardTitle>
          <CardDescription>Real-time network traffic over time</CardDescription>
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
              <p className="text-sm">No network data available</p>
              <p className="text-xs">Network metrics may not be configured</p>
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
          Network Usage
          {isFetching && (
            <div className="size-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          )}
        </CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Real-time network traffic over{' '}
            {timeRangeOptions
              .find((opt) => opt.value === timeRange)
              ?.label.toLowerCase()}
          </span>
          <span className="@[540px]/card:hidden">
            Traffic over{' '}
            {timeRangeOptions
              .find((opt) => opt.value === timeRange)
              ?.label.toLowerCase()}
          </span>
        </CardDescription>
        <CardAction>
          <Select
            value={timeRange}
            onValueChange={onTimeRangeChange}
            disabled={isLoading}
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
              <linearGradient id="fillNetworkIn" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-networkIn)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-networkIn)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillNetworkOut" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-networkOut)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-networkOut)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
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
              tickFormatter={(value) => formatBytes(Math.abs(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(value) => {
                    return formatDate(value)
                  }}
                  formatter={(value, name) => [
                    formatBytes(Math.abs(Number(value))),
                    ' ',
                    chartConfig[name as keyof typeof chartConfig]?.label ||
                      name,
                  ]}
                />
              }
            />
            <Area
              dataKey="networkIn"
              type="monotone"
              fill="url(#fillNetworkIn)"
              stroke="var(--color-networkIn)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              dataKey="networkOut"
              type="monotone"
              fill="url(#fillNetworkOut)"
              stroke="var(--color-networkOut)"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
