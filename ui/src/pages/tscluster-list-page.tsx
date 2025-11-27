import { useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { TypesenseClusterStatusIcon } from '@/components/tscluster-status-icon'
import { TypesenseClusterStatusDisplay } from '@/components/tscluster-status-display'
import {
  IconCircleCheckFilled,
  IconCircleDotFilled,
  IconProgressHelp,
} from '@tabler/icons-react'

import { Condition } from 'kubernetes-types/meta/v1'

import {
  clusterScopeResources,
  ResourceType,
  ResourceTypeMap,
} from '@/types/api'

import { ResourceTable } from '@/components/resource-table'

export interface ResourceTableProps {
  resourceType?: ResourceType
}

export function TypesenseClusterListPage<T extends keyof ResourceTypeMap>({
  resourceType,
}: ResourceTableProps) {
  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<ResourceTypeMap[T]>()
  const isClusterScope =
    resourceType && clusterScopeResources.includes(resourceType)

  // Define columns for the service table
  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.metadata?.name, {
        header: 'Name',
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link
              to={`/${resourceType}${isClusterScope ? '' : `/${row.original.metadata!.namespace}`}/${row.original.metadata!.name}`}
            >
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.spec?.image, {
        header: 'Version',
        cell: ({ getValue }) => {
          const version = getValue() || ''

          return (
            <span className="text-muted-foreground text-sm">{version.replace(/typesense\/typesense:/g, '')}</span>
          )
        },
      }),
      columnHelper.accessor((row) => row.spec?.replicas, {
        header: 'Desired Replicas',
        cell: ({ getValue }) => {
          const dateStr = getValue() || ''

          return (
            <span className="text-muted-foreground text-sm">{dateStr}</span>
          )
        },
      }),
      columnHelper.accessor((row) => row.status?.phase, {
        header: 'Phase',
        cell: ({ getValue }) => {
          const status = getValue() || ''

          return (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <TypesenseClusterStatusIcon status={status} />
              {/* {status.replace(/([A-Z])/g, ' $1').trim()} */}
              <TypesenseClusterStatusDisplay status={status} />
            </Badge>
            // <span className="text-muted-foreground text-sm">{status.replace(/([A-Z])/g, ' $1').trim()}</span>
          )
        },
      }),
      columnHelper.accessor((row) => row.status?.conditions, {
        header: 'Ready',
        cell: ({ getValue }) => {
          const conditions = (getValue() as Condition[] | undefined) ?? [];

          // find Ready conditions only
          const readyConds = conditions.filter((c) => c?.type === "Ready");
          if (readyConds.length === 0) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          // safe parse of date; fallback to epoch 0 for invalid/missing
          const parseTime = (iso?: string) => {
            const t = Date.parse(String(iso));
            return isNaN(t) ? 0 : t;
          };

          // pick the newest by lastTransitionTime
          const newest = readyConds.reduce((a, b) => {
            return parseTime(a.lastTransitionTime) >= parseTime(b.lastTransitionTime)
              ? a
              : b;
          });

          const status = (newest.status ?? "Unknown").toString(); // "True" | "False" | "Unknown"
          const last = newest.lastTransitionTime
            ? new Date(newest.lastTransitionTime).toLocaleString()
            : "unknown";

          // decide UI
          if (status === "True") {
            return (
              <span title={`Ready: True (since ${last})`} aria-label="Ready: True">
                <IconCircleCheckFilled className="inline-block fill-green-500 dark:fill-green-400" />
              </span>
            );
          }

          if (status === "False") {
            return (
              <span title={`Ready: False (since ${last})`} aria-label="Ready: False">
                <IconCircleDotFilled className="inline-block fill-red-600 dark:fill-red-500" />
              </span>
            );
          }

          // Unknown or any other value
          return (
            <span title={`Ready: ${status} (since ${last})`} aria-label={`Ready: ${status}`}>
              <IconProgressHelp className="inline-block fill-gray-400 dark:fill-gray-500" />
            </span>
          );
        },
      }),
      // columnHelper.accessor((row) => row.metadata?.creationTimestamp, {
      //   header: 'Created',
      //   cell: ({ getValue }) => {
      //     const dateStr = formatDate(getValue() || '')

      //     return (
      //       <span className="text-muted-foreground text-sm">{dateStr}</span>
      //     )
      //   },
      // }),
    ],
    [columnHelper, isClusterScope, resourceType]
  )

  const filter = useCallback((resource: ResourceTypeMap[T], query: string) => {
    return resource.metadata!.name!.toLowerCase().includes(query)
  }, [])

  if (!resourceType) {
    return <div>Resource type "{resourceType}" not found</div>
  }

  return (
    <ResourceTable
      resourceName={resourceType}
      columns={columns}
      clusterScope={clusterScopeResources.includes(resourceType)}
      searchQueryFilter={filter}
    />
  )
}
