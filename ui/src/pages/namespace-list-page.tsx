import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Namespace } from 'kubernetes-types/core/v1'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { getAge } from '@/lib/utils'
import { ResourceTable } from '@/components/resource-table'

export function NamespaceListPage() {
  const { t } = useTranslation()
  // Definecolumn helper outside of any hooks
  const columnHelper = createColumnHelper<Namespace>()

  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: t('common.name'),
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link to={`/namespaces/${row.original.metadata!.name}`}>
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor('status.phase', {
        header: t('common.status'),
        cell: ({ row }) => row.original.status!.phase || 'Unknown',
      }),
      columnHelper.accessor('metadata.creationTimestamp', {
        header: t('common.created'),
        cell: ({ getValue }) => {
          return getAge(getValue() as string)
        },
      }),
    ],
    [columnHelper, t]
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
