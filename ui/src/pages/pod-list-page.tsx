import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Pod } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { formatDate } from '@/lib/utils'
import { PodStatusIcon } from '@/components/pod-status-icon'
import { ResourceTable } from '@/components/resource-table'

export function PodListPage() {
  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<Pod>()

  // Define columns for the pod table - moved outside render cycle for better performance
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link
              to={`/pods/${row.original.metadata!.namespace}/${
                row.original.metadata!.name
              }`}
            >
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.status!.containerStatuses, {
        id: 'containers',
        header: 'Ready',
        cell: ({ row }) => {
          const containerStatuses = row.original.status!.containerStatuses || []
          return (
            <div>
              {containerStatuses.filter((s) => s.ready).length} /{' '}
              {containerStatuses.length}
            </div>
          )
        },
      }),
      columnHelper.accessor('status.phase', {
        header: 'Status',
        enableColumnFilter: true,
        cell: ({ row }) => <PodStatusIcon pod={row.original} />,
      }),
      columnHelper.accessor('status.podIP', {
        header: 'IP',
        cell: ({ getValue }) => getValue() || '-',
      }),
      columnHelper.accessor('spec.nodeName', {
        header: 'Node',
        enableColumnFilter: true,
        cell: ({ getValue }) => getValue() || '-',
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

  // Custom filter for pod search
  const podSearchFilter = useCallback((pod: Pod, query: string) => {
    return (
      pod.metadata!.name!.toLowerCase().includes(query) ||
      (pod.spec!.nodeName?.toLowerCase() || '').includes(query) ||
      (pod.status!.podIP?.toLowerCase() || '').includes(query)
    )
  }, [])

  return (
    <ResourceTable<Pod>
      resourceName="Pods"
      columns={columns}
      clusterScope={false}
      searchQueryFilter={podSearchFilter}
    />
  )
}
