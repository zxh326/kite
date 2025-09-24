import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Service } from 'kubernetes-types/core/v1'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { getServiceExternalIP } from '@/lib/k8s'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ResourceTable } from '@/components/resource-table'

export function ServiceListPage() {
  const { t } = useTranslation()
  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<Service>()

  // Define columns for the service table
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: t('common.name'),
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link
              to={`/services/${row.original.metadata!.namespace}/${
                row.original.metadata!.name
              }`}
            >
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor('spec.type', {
        header: t('services.type'),
        cell: ({ getValue }) => {
          const type = getValue() || 'ClusterIP'
          return <Badge variant="outline">{type}</Badge>
        },
      }),
      columnHelper.accessor('spec.clusterIP', {
        header: t('services.clusterIP'),
        cell: ({ getValue }) => {
          const val = getValue() || '-'
          return (
            <span className="font-mono text-sm text-muted-foreground">
              {val}
            </span>
          )
        },
      }),
      columnHelper.accessor('status.loadBalancer.ingress', {
        header: t('services.externalIP'),
        cell: ({ row }) => {
          const val = getServiceExternalIP(row.original)
          return (
            <span className="font-mono text-sm text-muted-foreground">
              {val}
            </span>
          )
        },
      }),
      columnHelper.accessor('spec.ports', {
        header: t('services.ports'),
        cell: ({ getValue }) => {
          const ports = getValue() || []
          if (ports.length === 0) return '-'
          const text = ports
            .map((port) => {
              const protocol = port.protocol || 'TCP'
              if (port.nodePort) {
                return `${port.port}:${port.nodePort}/${protocol}`
              }
              return `${port.port}/${protocol}`
            })
            .join(', ')
          return (
            <span className="font-mono text-sm text-muted-foreground">
              {text}
            </span>
          )
        },
      }),
      columnHelper.accessor('metadata.creationTimestamp', {
        header: t('common.created'),
        cell: ({ getValue }) => {
          const dateStr = formatDate(getValue() || '')

          return (
            <span className="text-muted-foreground text-sm">{dateStr}</span>
          )
        },
      }),
    ],
    [columnHelper, t]
  )

  // Custom filter for service search
  const serviceSearchFilter = useCallback((service: Service, query: string) => {
    return (
      service.metadata!.name!.toLowerCase().includes(query) ||
      (service.spec!.type?.toLowerCase() || '').includes(query) ||
      (service.spec!.clusterIP?.toLowerCase() || '').includes(query)
    )
  }, [])

  return (
    <ResourceTable
      resourceName="Services"
      columns={columns}
      clusterScope={false} // Services are namespace-scoped
      searchQueryFilter={serviceSearchFilter}
    />
  )
}
