import { useMemo } from 'react'
import { IconLoader } from '@tabler/icons-react'
import { Pod } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { PodWithMetrics } from '@/types/api'
import { getPodStatus } from '@/lib/k8s'
import { formatDate } from '@/lib/utils'

import { PodMetricCell } from './pod-metrics-cell'
import { PodStatusIcon } from './pod-status-icon'
import { Column, SimpleTable } from './simple-table'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function PodTable(props: {
  pods?: PodWithMetrics[]
  labelSelector?: string
  isLoading?: boolean
  hiddenNode?: boolean
}) {
  const { pods, isLoading } = props

  // Pod table columns
  const podColumns = useMemo(
    (): Column<PodWithMetrics>[] => [
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
        header: 'Ready',
        accessor: (pod: Pod) => {
          const status = getPodStatus(pod)
          return `${status.readyContainers} / ${status.totalContainers}`
        },
        cell: (value: unknown) => value as string,
      },
      {
        header: 'Restart',
        accessor: (pod: Pod) => {
          const status = getPodStatus(pod)
          return status.restartString || '0'
        },
        cell: (value: unknown) => {
          return (
            <span className="text-muted-foreground text-sm">
              {value as number}
            </span>
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
              <PodStatusIcon status={status.reason} />
              {status.reason}
            </Badge>
          )
        },
      },
      {
        header: 'CPU',
        accessor: (pod: PodWithMetrics) => {
          return pod?.metrics?.cpuUsage || 0
        },
        cell: (value: unknown) => {
          const cpuValue = value as number
          return <PodMetricCell type="cpu" value={cpuValue} />
        },
      },
      {
        header: 'Memory',
        accessor: (pod: PodWithMetrics) => {
          return pod?.metrics?.memoryUsage || 0
        },
        cell: (value: unknown) => {
          const memoryValue = value as number
          return <PodMetricCell type="memory" value={memoryValue} />
        },
      },
      {
        header: 'IP',
        accessor: (pod: Pod) => pod.status?.podIP || '-',
        cell: (value: unknown) => value as string,
      },
      ...(props.hiddenNode
        ? []
        : [
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
          ]),
      {
        header: 'Created',
        accessor: (pod: Pod) => pod.metadata?.creationTimestamp || '',
        cell: (value: unknown) => {
          return (
            <span className="text-muted-foreground text-sm">
              {formatDate(value as string, true)}
            </span>
          )
        },
      },
    ],
    [props.hiddenNode]
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
