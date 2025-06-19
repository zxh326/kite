import { useMemo } from 'react'
import { IconLoader } from '@tabler/icons-react'
import { Pod } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { useResources } from '@/lib/api'
import { getPodStatus } from '@/lib/k8s'

import { PodStatusIcon } from './pod-status-icon'
import { Column, SimpleTable } from './simple-table'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function PodTable(props: {
  pods?: Pod[]
  labelSelector?: string
  isLoading?: boolean
}) {
  const { pods, isLoading } = props

  const namespace = pods?.[0]?.metadata?.namespace || ''

  // Fetch current metrics for all pods
  const { data: metricsData } = useResources('podmetrics', namespace, {
    refreshInterval: 5000,
    disable: !pods || pods.length === 0,
    labelSelector: props.labelSelector,
  })

  // Create a map for quick metrics lookup
  const metricsMap = useMemo(() => {
    const map = new Map<string, { cpu: number; memory: number }>()
    metricsData?.forEach((metric) => {
      let cpu = 0
      let memory = 0
      metric.containers.forEach((container) => {
        const cpuUsage = parseInt(container.usage.cpu, 10) || 0
        if (container.usage.cpu.endsWith('n')) {
          cpu += cpuUsage / 1e9 // Convert from nanocores to millicores
        } else if (container.usage.cpu.endsWith('m')) {
          cpu += cpuUsage
        }

        const memoryUsage = parseInt(container.usage.memory, 10) || 0
        if (container.usage.memory.endsWith('Ki')) {
          memory += memoryUsage / 1024 // Convert from KiB to MB
        } else if (container.usage.memory.endsWith('Mi')) {
          memory += memoryUsage
        } else if (container.usage.memory.endsWith('Gi')) {
          memory += memoryUsage * 1024 // Convert from GiB to MB
        }
      })
      map.set(metric.metadata.name, { cpu, memory })
    })
    return map
  }, [metricsData])

  // Pod table columns
  const podColumns = useMemo(
    (): Column<Pod>[] => [
      {
        header: 'Name',
        accessor: (pod: Pod) => pod.metadata,
        cell: (value: unknown) => {
          const meta = value as Pod['metadata']
          return (
            <div className="font-medium text-blue-500 hover:underline">
              <Link to={`/pods/${meta!.namespace}/${meta!.name}`}>
                {meta!.name}
              </Link>
            </div>
          )
        },
      },
      {
        header: 'Status',
        accessor: (pod: Pod) => pod,
        cell: (value: unknown) => {
          const status = getPodStatus(value as Pod)
          return (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <PodStatusIcon status={status} />
              {status}
            </Badge>
          )
        },
      },
      {
        header: 'CPU',
        accessor: (pod: Pod) => {
          const metrics = metricsMap.get(pod.metadata?.name || '')
          return metrics?.cpu || 0
        },
        cell: (value: unknown) => {
          const cpuValue = value as number
          if (cpuValue === 0)
            return <span className="text-muted-foreground">-</span>
          return (
            <span className="text-sm text-muted-foreground">
              {(cpuValue * 1000).toFixed(0)}m
            </span>
          )
        },
      },
      {
        header: 'Memory',
        accessor: (pod: Pod) => {
          const metrics = metricsMap.get(pod.metadata?.name || '')
          return metrics?.memory || 0
        },
        cell: (value: unknown) => {
          const memoryValue = value as number
          if (memoryValue === 0)
            return <span className="text-muted-foreground">-</span>

          // Format memory value appropriately
          if (memoryValue < 1024) {
            return (
              <span className="text-muted-foreground text-sm">
                {memoryValue.toFixed(1)} MB
              </span>
            )
          } else {
            return (
              <span className="text-muted-foreground text-sm">
                {(memoryValue / 1024).toFixed(2)} GB
              </span>
            )
          }
        },
      },
      {
        header: 'IP',
        accessor: (pod: Pod) => pod.status?.podIP || '-',
        cell: (value: unknown) => value as string,
      },
      {
        header: 'Node',
        accessor: (pod: Pod) => pod.spec?.nodeName || '-',
        cell: (value: unknown) => (
          <Link
            to={`/nodes/${value}`}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {value as string}
          </Link>
        ),
      },
      {
        header: 'Created',
        accessor: (pod: Pod) => pod.metadata?.creationTimestamp || '',
        cell: (value: unknown) => {
          const date = new Date(value as string)
          return (
            <span className="text-muted-foreground text-sm">
              {date.toLocaleString()}
            </span>
          )
        },
      },
    ],
    [metricsMap]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader className="animate-spin mr-2" />
        Loading pods...
      </div>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pods</CardTitle>
      </CardHeader>
      <CardContent>
        <SimpleTable
          data={pods || []}
          columns={podColumns}
          emptyMessage="No pods found"
          pagination={{
            enabled: true,
            pageSize: 20,
            showPageInfo: true,
          }}
        />
      </CardContent>
    </Card>
  )
}
