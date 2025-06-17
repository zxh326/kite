import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Service } from 'kubernetes-types/core/v1'
import { Link } from 'react-router-dom'

import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ResourceTable } from '@/components/resource-table'

export function ServiceListPage() {
  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<Service>()

  // Define columns for the service table
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: 'Name',
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
        header: 'Type',
        cell: ({ getValue }) => {
          const type = getValue() || 'ClusterIP'
          return <Badge variant="outline">{type}</Badge>
        },
      }),
      columnHelper.accessor('spec.clusterIP', {
        header: 'Cluster IP',
        cell: ({ getValue }) => getValue() || '-',
      }),
      columnHelper.accessor('status.loadBalancer.ingress', {
        header: 'External IP',
        cell: ({ row }) => {
          const ingress = row.original.status?.loadBalancer?.ingress || []
          if (ingress.length === 0) return '-'
          return ingress.map((i) => i.ip || i.hostname).join(', ')
        },
      }),
      columnHelper.accessor('spec.ports', {
        header: 'Ports',
        cell: ({ getValue }) => {
          const ports = getValue() || []
          if (ports.length === 0) return '-'
          return ports
            .map((port) => {
              const protocol = port.protocol || 'TCP'
              if (port.nodePort) {
                return `${port.port}:${port.nodePort}/${protocol}`
              }
              return `${port.port}/${protocol}`
            })
            .join(', ')
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
