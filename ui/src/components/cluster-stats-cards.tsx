import {
  IconAlertCircleFilled,
  IconBox,
  IconCircleCheckFilled,
  IconFolders,
  IconNetwork,
  IconServer,
} from '@tabler/icons-react'

import { OverviewData } from '@/types/api'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface ClusterStatsCardsProps {
  stats?: OverviewData
  isLoading?: boolean
}

export function ClusterStatsCards({
  stats,
  isLoading,
}: ClusterStatsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  const statsConfig = [
    {
      label: 'Nodes',
      value: stats.totalNodes,
      subValue: stats.readyNodes,
      icon: IconServer,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Pods',
      value: stats.totalPods,
      subValue: stats.runningPods,
      icon: IconBox,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Namespaces',
      value: stats.totalNamespaces,
      icon: IconFolders,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Services',
      value: stats.totalServices,
      icon: IconNetwork,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {statsConfig.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="@container/card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`size-6 ${stat.color}`} />
                  </div>
                  <div>
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {stat.value}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {stat.subValue === undefined ||
                      stat.subValue === stat.value ? (
                        <div className="flex items-center gap-1">
                          <IconCircleCheckFilled className="size-4 text-green-600 flex-shrink-0" />
                          All ready
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <IconAlertCircleFilled className="size-4 text-red-600 flex-shrink-0" />
                          {stat.value - (stat.subValue || 0)} Not Ready
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
