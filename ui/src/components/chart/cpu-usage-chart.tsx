'use client'

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

interface CpuUsageChartProps {
  data: UsageDataPoint[]
  isLoading?: boolean
  error?: Error | null
  syncId?: string
}

const cpuChartConfig = {
  cpu: {
    label: 'CPU (cores)',
    theme: {
      light: 'hsl(220, 70%, 50%)',
      dark: 'hsl(210, 80%, 60%)',
    },
  },
} satisfies ChartConfig

const CPUUsageChart = React.memo((prop: CpuUsageChartProps) => {
  const { data, isLoading, error, syncId } = prop

  const cpuChartData = React.useMemo(() => {
    if (!data) return []

    return data
      .map((point) => ({
        timestamp: point.timestamp,
        time: new Date(point.timestamp).getTime(),
        cpu: point.value,
      }))
      .sort((a, b) => a.time - b.time)
  }, [data])

  const isSameDay = React.useMemo(() => {
    if (cpuChartData.length < 2) return true
    const first = new Date(cpuChartData[0].timestamp)
    const last = new Date(cpuChartData[cpuChartData.length - 1].timestamp)
    return first.toDateString() === last.toDateString()
  }, [cpuChartData])

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            CPU Usage
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
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>CPU Usage</CardTitle>
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
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>CPU Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[250px] w-full items-center justify-center text-muted-foreground">
            <p>No CPU usage data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>CPU Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={cpuChartConfig} className="h-[250px] w-full">
          <AreaChart data={cpuChartData} syncId={syncId}>
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
              tickFormatter={(value) => `${value.toFixed(3)}`}
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
              dataKey="cpu"
              type="monotone"
              fill="var(--color-cpu)"
              stroke="var(--color-cpu)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
})

export default CPUUsageChart
