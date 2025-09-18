import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { get } from 'lodash'
import { Link, useParams } from 'react-router-dom'

import { CustomResource, ResourceType } from '@/types/api'
import { useResource } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { ResourceTable } from '@/components/resource-table'

export function CRListPage() {
  const { crd } = useParams<{ crd: string }>()
  const { data: crdData, isLoading: isLoadingCRD } = useResource('crds', crd!)

  const columnHelper = createColumnHelper<CustomResource>()

  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.accessor('metadata.name', {
        header: 'Name',
        cell: ({ row }) => {
          const resource = row.original
          const namespace = resource.metadata?.namespace
          const path = namespace
            ? `/crds/${crd}/${namespace}/${resource.metadata.name}`
            : `/crds/${crd}/${resource.metadata.name}`

          return (
            <div className="font-medium text-blue-500 hover:underline">
              <Link to={path}>{resource.metadata.name}</Link>
            </div>
          )
        },
      }),
    ]

    const additionalColumns =
      crdData?.spec.versions[0].additionalPrinterColumns?.map(
        (printerColumn) => {
          const jsonPath = printerColumn.jsonPath.startsWith('.')
            ? printerColumn.jsonPath.slice(1)
            : printerColumn.jsonPath

          return columnHelper.accessor((row) => get(row, jsonPath), {
            id: jsonPath || printerColumn.name,
            header: printerColumn.name,
            cell: ({ getValue }) => {
              const type = printerColumn.type
              const value = getValue()
              if (!value) {
                return <span className="text-sm text-muted-foreground">-</span>
              }
              if (type === 'date') {
                return (
                  <span className="text-sm text-muted-foreground">
                    {formatDate(value)}
                  </span>
                )
              }
              return (
                <span className="text-sm text-muted-foreground">{value}</span>
              )
            },
          })
        }
      )
    return [...baseColumns, ...(additionalColumns ?? [])]
  }, [columnHelper, crd, crdData?.spec.versions])

  const searchQueryFilter = useCallback((cr: CustomResource, query: string) => {
    const searchFields = [
      cr.metadata?.name || '',
      cr.metadata?.namespace || '',
      cr.kind || '',
      cr.apiVersion || '',
      ...(cr.metadata?.labels ? Object.keys(cr.metadata.labels) : []),
      ...(cr.metadata?.labels ? Object.values(cr.metadata.labels) : []),
    ]

    return searchFields.some((field) =>
      field.toLowerCase().includes(query.toLowerCase())
    )
  }, [])

  if (isLoadingCRD) {
    return <div>Loading...</div>
  }

  if (!crdData) {
    return <div>Error: CRD name is required</div>
  }

  return (
    <ResourceTable
      resourceName={crdData.spec.names.kind || 'Custom Resources'}
      resourceType={crd as ResourceType}
      columns={columns}
      clusterScope={crdData.spec.scope === 'Cluster'}
      searchQueryFilter={searchQueryFilter}
    />
  )
}
