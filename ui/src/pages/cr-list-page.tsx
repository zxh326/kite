import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Link, useParams } from 'react-router-dom'

import { CustomResource, ResourceType } from '@/types/api'
import { useResource } from '@/lib/api'
import { getAge } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ResourceTable } from '@/components/resource-table'

export function CRListPage() {
  const { crd } = useParams<{ crd: string }>()
  const { data: crdData, isLoading: isLoadingCRD } = useResource('crds', crd!)

  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<CustomResource>()

  // Define columns for the CR table
  const columns = useMemo(
    () =>
      [
        columnHelper.accessor('metadata.name', {
          header: 'Name',
          cell: ({ row }) => {
            const cr = row.original
            const hasNamespace = cr.metadata?.namespace
            const path = hasNamespace
              ? `/crds/${crd}/${cr.metadata.namespace}/${cr.metadata.name}`
              : `/crds/${crd}/${cr.metadata.name}`

            return (
              <div className="font-medium text-blue-500 hover:underline">
                <Link to={path}>{cr.metadata.name}</Link>
              </div>
            )
          },
        }),
        columnHelper.accessor('kind', {
          header: 'Kind',
          cell: ({ getValue }) => (
            <span className=" text-sm">{getValue()}</span>
          ),
        }),
        columnHelper.accessor('apiVersion', {
          header: 'API Version',
          cell: ({ getValue }) => (
            <span className=" text-xs text-gray-600">{getValue()}</span>
          ),
        }),
        columnHelper.accessor('status', {
          header: 'Status',
          cell: ({ getValue }) => {
            const status = getValue()
            // Try to extract status information from common patterns
            let statusText = 'Unknown'
            let variant: 'default' | 'destructive' | 'secondary' = 'secondary'

            if (status) {
              // Check for common status patterns
              if (status.phase && typeof status.phase === 'string') {
                statusText = status.phase
                variant =
                  status.phase === 'Running' || status.phase === 'Active'
                    ? 'default'
                    : status.phase === 'Failed'
                      ? 'destructive'
                      : 'secondary'
              } else if (
                status.conditions &&
                Array.isArray(status.conditions)
              ) {
                const readyCondition = status.conditions.find(
                  (c: Record<string, unknown>) =>
                    c.type === 'Ready' || c.type === 'Available'
                )
                if (readyCondition) {
                  statusText =
                    readyCondition.status === 'True' ? 'Ready' : 'Not Ready'
                  variant =
                    readyCondition.status === 'True' ? 'default' : 'destructive'
                }
              } else if (typeof status.ready === 'boolean') {
                statusText = status.ready ? 'Ready' : 'Not Ready'
                variant = status.ready ? 'default' : 'destructive'
              }
            }

            return (
              <Badge variant={variant} className="text-xs">
                {statusText}
              </Badge>
            )
          },
        }),
        columnHelper.accessor('metadata.creationTimestamp', {
          header: 'Age',
          cell: ({ getValue }) => {
            return getAge(getValue() as string)
          },
        }),
      ].filter((column) => column !== undefined),
    [columnHelper, crd]
  )

  // Custom search filter for CRs
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
      resourceName={`Custom Resources (${crd})`}
      resourceType={crd as ResourceType}
      columns={columns}
      clusterScope={crdData.spec.scope === 'Cluster'}
      searchQueryFilter={searchQueryFilter}
    />
  )
}
