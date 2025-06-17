import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { PersistentVolumeClaim } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ResourceTable } from '@/components/resource-table'

export function PVCListPage() {
  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<PersistentVolumeClaim>()

  // Define columns for the pvc table
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link
              to={`/persistentvolumeclaims/${row.original.metadata!.namespace}/${
                row.original.metadata!.name
              }`}
            >
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor('status.phase', {
        header: 'Status',
        cell: ({ getValue }) => {
          const phase = getValue() || 'Unknown'
          let variant: 'default' | 'destructive' | 'secondary' = 'secondary'

          switch (phase) {
            case 'Bound':
              variant = 'default'
              break
            case 'Lost':
              variant = 'destructive'
              break
            case 'Pending':
              variant = 'secondary'
              break
          }

          return <Badge variant={variant}>{phase}</Badge>
        },
      }),
      columnHelper.accessor('spec.volumeName', {
        header: 'Volume',
        cell: ({ getValue }) => getValue() || '-',
      }),
      columnHelper.accessor('spec.storageClassName', {
        header: 'Storage Class',
        cell: ({ getValue }) => getValue() || '-',
      }),
      columnHelper.accessor('spec.resources.requests.storage', {
        header: 'Capacity',
        cell: ({ getValue }) => getValue() || '-',
      }),
      columnHelper.accessor('spec.accessModes', {
        header: 'Access Modes',
        cell: ({ getValue }) => {
          const modes = getValue() || []
          return modes.join(', ') || '-'
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

  // Custom filter for pvc search
  const pvcSearchFilter = useCallback(
    (pvc: PersistentVolumeClaim, query: string) => {
      return (
        pvc.metadata!.name!.toLowerCase().includes(query) ||
        (pvc.metadata!.namespace?.toLowerCase() || '').includes(query) ||
        (pvc.spec!.volumeName?.toLowerCase() || '').includes(query) ||
        (pvc.spec!.storageClassName?.toLowerCase() || '').includes(query) ||
        (pvc.status!.phase?.toLowerCase() || '').includes(query)
      )
    },
    []
  )

  return (
    <ResourceTable
      resourceName="PersistentVolumeClaims"
      columns={columns}
      searchQueryFilter={pvcSearchFilter}
    />
  )
}
