import { useState } from 'react'
import { Container, Pod } from 'kubernetes-types/core/v1'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContainerSelector } from '@/components/selector/container-selector'

import { PodResourceUsageChart } from './pod-resource-usage-chart'
import { PodSelector } from './selector/pod-selector'

interface PodMonitoringProps {
  namespace: string
  podName?: string
  defaultQueryName?: string
  pods?: Pod[]
  containers: Container[]
  labelSelector?: string
}

export function PodMonitoring({
  namespace,
  podName,
  defaultQueryName,
  pods,
  containers,
  labelSelector,
}: PodMonitoringProps) {
  const [selectedPod, setSelectedPod] = useState<string | undefined>(
    podName || undefined
  )
  const [timeRange, setTimeRange] = useState('30m')
  const [selectedContainer, setSelectedContainer] = useState<
    string | undefined
  >(undefined)
  const [refreshInterval, setRefreshInterval] = useState('30s')

  const timeRangeOptions = [
    { value: '30m', label: 'Last 30 min' },
    { value: '1h', label: 'Last 1 hour' },
    { value: '24h', label: 'Last 24 hours' },
  ]

  const refreshIntervalOptions = [
    { value: 'off', label: 'Off' },
    { value: '5s', label: '5 seconds' },
    { value: '10s', label: '10 seconds' },
    { value: '30s', label: '30 seconds' },
    { value: '60s', label: '60 seconds' },
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

        <div className="space-y-2">
          <Select value={refreshInterval} onValueChange={setRefreshInterval}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select refresh interval" />
            </SelectTrigger>
            <SelectContent>
              {refreshIntervalOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <ContainerSelector
            containers={containers.map((c) => ({
              name: c.name,
              image: c.image || '',
            }))}
            selectedContainer={selectedContainer}
            onContainerChange={setSelectedContainer}
          />
        </div>
        {pods && pods.length > 1 && (
          <div className="space-y-2">
            {/* Pod Selector */}
            <PodSelector
              pods={pods}
              showAllOption={true}
              selectedPod={selectedPod}
              onPodChange={(podName) => {
                setSelectedPod(podName)
              }}
            />
          </div>
        )}
      </div>

      <PodResourceUsageChart
        namespace={namespace}
        podName={
          selectedPod ||
          podName ||
          defaultQueryName ||
          pods?.[0]?.metadata?.generateName
            ?.split('-')
            .slice(0, -2)
            .join('-') ||
          ''
        }
        container={selectedContainer}
        timeRange={timeRange}
        refreshInterval={refreshInterval}
        onTimeRangeChange={setTimeRange}
        labelSelector={labelSelector}
      />
    </div>
  )
}
