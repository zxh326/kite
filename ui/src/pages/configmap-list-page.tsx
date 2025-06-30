import { useCallback, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { ConfigMap } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { formatDate } from '@/lib/utils'
import { ResourcePaginationTable } from '@/components/resource-pagination-table'

export function ConfigMapListPage() {
  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<ConfigMap>()
  const [selectedNamespace, setSelectedNamespace] = useState<string>()

  // Define columns for the configmap table
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link
              to={`/configmaps/${row.original.metadata!.namespace}/${
                row.original.metadata!.name
              }`}
            >
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor('data', {
        header: 'Data Keys',
        cell: ({ getValue }) => {
          const data = getValue() || {}
          const keys = Object.keys(data)
          if (keys.length === 0) {
            return '-'
          }
          // Limit to first 5 keys for display
          return keys.length > 5 ? (
            <span className="text-muted-foreground">
              {keys.slice(0, 5).join(', ')}...
            </span>
          ) : (
            <span className="text-muted-foreground">{keys.join(', ')}</span>
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

  // Custom filter for configmap search
  const configMapSearchFilter = useCallback(
    (configMap: ConfigMap, query: string) => {
      const dataKeys = Object.keys(configMap.data || {}).join(' ')
      const binaryDataKeys = Object.keys(configMap.binaryData || {}).join(' ')

      return (
        configMap.metadata!.name!.toLowerCase().includes(query) ||
        (configMap.metadata!.namespace?.toLowerCase() || '').includes(query) ||
        dataKeys.toLowerCase().includes(query) ||
        binaryDataKeys.toLowerCase().includes(query)
      )
    },
    []
  )

  return (
    <ResourcePaginationTable<ConfigMap>
      resourceType="configmaps"
      columns={columns}
      clusterScope={false}
      selectedNamespace={selectedNamespace}
      onNamespaceChange={setSelectedNamespace}
      pageSize={10}
      searchQueryFilter={configMapSearchFilter}
    />
  )
}
