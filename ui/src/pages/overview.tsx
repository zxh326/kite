import { useState } from 'react'

import { useOverview, useResourceUsageHistory } from '@/lib/api'
import NetworkUsageChart from '@/components/chart/network-usage-chart'
import ResourceUtilizationChart from '@/components/chart/resource-utilization'
import { ClusterStatsCards } from '@/components/cluster-stats-cards'
import { RecentEvents } from '@/components/recent-events'
import { ResourceCharts } from '@/components/resources-charts'

export function Overview() {
  const [timeRange] = useState('30m')
  const { data: overview, isLoading, error, isError } = useOverview()

  const {
    data: resourceUsage,
    isLoading: isLoadingResourceUsage,
    error: errorResourceUsage,
  } = useResourceUsageHistory(timeRange)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <h2 className="text-lg font-semibold">Failed to load overview data</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
      </div>

      <ClusterStatsCards stats={overview} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-4 @5xl/main:grid-cols-2">
        <ResourceCharts
          data={overview?.resource}
          isLoading={isLoading}
          error={error}
          isError={isError}
        />
        <RecentEvents />
      </div>

      {overview?.prometheusEnabled && (
        <div className="grid grid-cols-1 gap-4 @5xl/main:grid-cols-2">
          <ResourceUtilizationChart
            cpu={resourceUsage?.cpu || []}
            memory={resourceUsage?.memory || []}
            isLoading={isLoadingResourceUsage}
            error={errorResourceUsage}
          />

          <NetworkUsageChart
            networkIn={resourceUsage?.networkIn || []}
            networkOut={resourceUsage?.networkOut || []}
            isLoading={isLoadingResourceUsage}
            error={errorResourceUsage}
          />
        </div>
      )}
    </div>
  )
}
