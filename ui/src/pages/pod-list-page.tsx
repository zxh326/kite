import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Pod } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { getPodStatus } from '@/lib/k8s'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { PodStatusIcon } from '@/components/pod-status-icon'
import { ResourcePaginationTable } from '@/components/resource-pagination-table'

export function PodListPage() {
  const [selectedNamespace, setSelectedNamespace] = useState<string>()
  
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
        id: "status.phase",
        cell: ({ row }) => {
          const status = getPodStatus(row.original)
          return (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <PodStatusIcon status={status} />
              {status}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('status.podIP', {
        header: 'IP',
        cell: ({ getValue }) => getValue() || '-',
      }),
      columnHelper.accessor('spec.nodeName', {
        id: "spec.nodeName",
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

  return (
    <ResourcePaginationTable<Pod>
      resourceType="pods"
      columns={columns}
      clusterScope={false}
      selectedNamespace={selectedNamespace}
      onNamespaceChange={setSelectedNamespace}
      pageSize={20}
    />
  )
}
