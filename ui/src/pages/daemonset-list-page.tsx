import { useCallback, useMemo } from 'react'
import { IconCircleCheckFilled, IconLoader } from '@tabler/icons-react'
import { createColumnHelper } from '@tanstack/react-table'
import { DaemonSet } from 'kubernetes-types/apps/v1'
import { Link } from 'react-router-dom'

import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ResourceTable } from '@/components/resource-table'

export function DaemonSetListPage() {
  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<DaemonSet>()

  // Define columns for the daemonset table
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link
              to={`/daemonsets/${row.original.metadata!.namespace}/${
                row.original.metadata!.name
              }`}
            >
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor('status.desiredNumberScheduled', {
        header: 'Desired',
        cell: ({ getValue }) => getValue() || 0,
      }),
      columnHelper.accessor('status.currentNumberScheduled', {
        header: 'Current',
        cell: ({ getValue }) => getValue() || 0,
      }),
      columnHelper.accessor('status.numberReady', {
        header: 'Ready',
        cell: ({ getValue }) => getValue() || 0,
      }),
      columnHelper.accessor('status.numberAvailable', {
        header: 'Available',
        cell: ({ getValue }) => getValue() || 0,
      }),
      columnHelper.accessor('status.conditions', {
        header: 'Status',
        cell: ({ row }) => {
          const readyReplicas = row.original.status?.numberReady || 0
          const replicas = row.original.status?.desiredNumberScheduled || 0
          const isAvailable = readyReplicas === replicas
          const status = isAvailable ? 'Available' : 'In Progress'
          if (replicas === 0) {
            return (
              <Badge
                variant="secondary"
                className="text-muted-foreground px-1.5"
              >
                Pending
              </Badge>
            )
          }

          return (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              {isAvailable ? (
                <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
              ) : (
                <IconLoader className="animate-spin" />
              )}
              {status}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('metadata.creationTimestamp', {
        header: 'Created',
        cell: ({ getValue }) => {
          const dateStr = formatDate(getValue() || '')

          return (
            <span className="text-muted-foreground text-sm">{dateStr}</span>
          )
        },
      }),
    ],
    [columnHelper]
  )

  // Custom filter for daemonset search
  const daemonSetSearchFilter = useCallback(
    (daemonSet: DaemonSet, query: string) => {
      return (
        daemonSet.metadata!.name!.toLowerCase().includes(query) ||
        (daemonSet.metadata!.namespace?.toLowerCase() || '').includes(query)
      )
    },
    []
  )

  return (
    <ResourceTable
      resourceName="DaemonSets"
      columns={columns}
      searchQueryFilter={daemonSetSearchFilter}
    />
  )
}
