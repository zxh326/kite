import { useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { NetworkUsageChart } from './network-usage-chart'
import { ResourceUsageHistoryChart } from './resource-usage-history-chart'

interface NodeMonitoringProps {
  name: string
}

export function NodeMonitoring({ name }: NodeMonitoringProps) {
  const [timeRange, setTimeRange] = useState('1h')

  const timeRangeOptions = [
    { value: '30m', label: 'Last 30 min' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
  ]

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="space-y-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resource Usage Charts */}
      <ResourceUsageHistoryChart
        timeRange={timeRange}
        instance={name}
        onTimeRangeChange={setTimeRange}
      />

      {/* Network Usage Chart */}
      <NetworkUsageChart
        timeRange={timeRange}
        instance={name}
        onTimeRangeChange={setTimeRange}
      />
    </div>
  )
}
