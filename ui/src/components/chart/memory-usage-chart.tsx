import React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { UsageDataPoint } from '@/types/api'
import { formatChartXTicks, formatDate } from '@/lib/utils'

import { Alert, AlertDescription } from '../ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart'
import { Skeleton } from '../ui/skeleton'

interface MemoryUsageChartProps {
  data: UsageDataPoint[]
  isLoading?: boolean
  error?: Error | null
  syncId?: string
}

const MemoryUsageChart = React.memo((prop: MemoryUsageChartProps) => {
  const { data, isLoading, error, syncId } = prop

  const memoryChartData = React.useMemo(() => {
    if (!data) return []

    return data
      .map((point) => ({
        timestamp: point.timestamp,
        time: new Date(point.timestamp).getTime(),
        memory: Math.max(0, point.value), // Memory is already in MB
      }))
      .sort((a, b) => a.time - b.time)
  }, [data])

  const isSameDay = React.useMemo(() => {
    if (memoryChartData.length < 2) return true
    const first = new Date(memoryChartData[0].timestamp)
    const last = new Date(memoryChartData[memoryChartData.length - 1].timestamp)
    return first.toDateString() === last.toDateString()
  }, [memoryChartData])

  // Determine if we should use GB instead of MB
  const useGB = React.useMemo(() => {
    if (!memoryChartData.length) return false
    const maxMemory = Math.max(...memoryChartData.map((point) => point.memory))
    return maxMemory > 900
  }, [memoryChartData])

  // Convert memory data to GB if needed
  const processedMemoryChartData = React.useMemo(() => {
    if (!useGB) return memoryChartData
    return memoryChartData.map((point) => ({
      ...point,
      memory: point.memory / 1024, // Convert MB to GB
    }))
  }, [memoryChartData, useGB])

  const dynamicMemoryChartConfig = React.useMemo(
    () => ({
      memory: {
        label: `Memory (${useGB ? 'GB' : 'MB'})`,
        theme: {
          light: 'hsl(142, 70%, 50%)',
          dark: 'hsl(150, 80%, 60%)',
        },
      },
    }),
    [useGB]
  ) satisfies ChartConfig

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memory Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Show empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            <p>No memory usage data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={dynamicMemoryChartConfig}
          className="h-[250px] w-full"
        >
          <AreaChart data={processedMemoryChartData} syncId={syncId}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={30}
              allowDataOverflow={true}
              tickFormatter={(value) => formatChartXTicks(value, isSameDay)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) =>
                `${value.toFixed(useGB ? 2 : 1)}${useGB ? 'GB' : 'MB'}`
              }
              domain={[0, (dataMax: number) => dataMax * 1.1]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDate(value)}
                />
              }
            />
            <Area
              isAnimationActive={false}
              dataKey="memory"
              type="monotone"
              fill="var(--color-memory)"
              stroke="var(--color-memory)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})

export default MemoryUsageChart
