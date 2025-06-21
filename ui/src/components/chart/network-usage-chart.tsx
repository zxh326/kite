'use client'

import React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'

import { UsageDataPoint } from '@/types/api'
import { formatChartXTicks } from '@/lib/utils'

import { Alert, AlertDescription } from '../ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart'
import { Skeleton } from '../ui/skeleton'

interface NetworkUsageChartProps {
  networkIn: UsageDataPoint[]
  networkOut: UsageDataPoint[]
  isLoading?: boolean
  error?: Error | null
  syncId?: string
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

const chartConfig = {
  networkOut: {
    label: 'Outgoing',
    color: 'oklch(0.55 0.22 235)', // Updated blue color to match theme
  },
  networkIn: {
    label: 'Incoming',
    color: 'oklch(0.55 0.20 145)', // Updated green color to match theme
  },
} satisfies ChartConfig

const NetworkUsageChart = React.memo((prop: NetworkUsageChartProps) => {
  const { networkIn, networkOut, isLoading, error, syncId } = prop

  const chartData = React.useMemo(() => {
    if (!networkIn || !networkOut) return []

    // Combine NetworkIn and NetworkOut data by timestamp
    const combinedData = new Map()

    // Add NetworkIn data (as negative values to display below X-axis)
    networkIn.forEach((point) => {
      const timestamp = new Date(point.timestamp).getTime()
      combinedData.set(timestamp, {
        timestamp: point.timestamp,
        time: timestamp,
        networkIn: -Math.max(0, point.value), // Convert to negative for below X-axis
      })
    })

    // Add NetworkOut data (positive values for above X-axis)
    networkOut.forEach((point) => {
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
  }, [networkIn, networkOut])

  const isSameDay = React.useMemo(() => {
    if (chartData.length < 2) return true
    const first = new Date(chartData[0].timestamp)
    const last = new Date(chartData[chartData.length - 1].timestamp)
    return first.toDateString() === last.toDateString()
  }, [chartData])

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Network Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="space-y-3">
            <Skeleton className="h-[250px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state
  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Network Usage</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show empty state
  if (
    !networkIn ||
    !networkOut ||
    (networkIn.length === 0 && networkOut.length === 0)
  ) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Network Usage</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            <p>No network usage data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Network Usage</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData} syncId={syncId}>
            <defs>
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
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => formatChartXTicks(value, isSameDay)}
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
                  labelFormatter={(value) => formatChartXTicks(value, false)}
                  formatter={(value, name) => [
                    <div key="indicator" className="flex items-center gap-2">
                      <div
                        className="shrink-0 rounded-[2px] w-1 h-3 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor:
                            chartConfig[name as keyof typeof chartConfig]
                              ?.color || '#666',
                        }}
                      />
                      <span>
                        {chartConfig[name as keyof typeof chartConfig]?.label ||
                          name}
                      </span>
                    </div>,
                    formatBytes(Math.abs(Number(value))),
                  ]}
                />
              }
            />
            <Area
              dataKey="networkOut"
              type="monotone"
              fill="url(#fillNetworkOut)"
              stroke="var(--color-networkOut)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              dataKey="networkIn"
              type="monotone"
              fill="url(#fillNetworkIn)"
              stroke="var(--color-networkIn)"
              strokeWidth={2}
              dot={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})

export default NetworkUsageChart
