import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Namespace } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { getAge } from '@/lib/utils'
import { ResourceTable } from '@/components/resource-table'

export function NamespaceListPage() {
  // Definecolumn helper outside of any hooks
  const columnHelper = createColumnHelper<Namespace>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link to={`/namespaces/${row.original.metadata!.name}`}>
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor('status.phase', {
        header: 'Status',
        cell: ({ row }) => row.original.status!.phase || 'Unknown',
      }),
      columnHelper.accessor('metadata.creationTimestamp', {
        header: 'Age',
        cell: ({ getValue }) => {
          return getAge(getValue() as string)
        },
      }),
    ],
    [columnHelper]
  )

  const filter = useCallback((ns: Namespace, query: string) => {
    return ns.metadata!.name!.toLowerCase().includes(query)
  }, [])

  return (
    <ResourceTable
      resourceName="Namespaces"
      columns={columns}
      clusterScope={true}
      searchQueryFilter={filter}
    />
  )
}
