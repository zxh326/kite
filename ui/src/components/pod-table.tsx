import { useMemo, useState } from 'react'
import { createColumnHelper, flexRender } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { IconLoader } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { PodWithMetrics } from '@/types/api'
import { getPodStatus } from '@/lib/k8s'
import { formatDate } from '@/lib/utils'

import { MetricCell } from './metrics-cell'
import { PodStatusIcon } from './pod-status-icon'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

export function PodTable(props: {
  pods?: PodWithMetrics[]
  labelSelector?: string
  isLoading?: boolean
  hiddenNode?: boolean
}) {
  const { pods, isLoading, hiddenNode } = props
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const columnHelper = createColumnHelper<PodWithMetrics>()

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
      columnHelper.accessor((row) => row.status?.containerStatuses, {
        id: 'ready',
        header: 'Ready',
        cell: ({ row }) => {
          const status = getPodStatus(row.original)
          return `${status.readyContainers} / ${status.totalContainers}`
        },
      }),
      columnHelper.accessor((row) => row.status, {
        id: 'restart',
        header: 'Restart',
        cell: ({ row }) => {
          const status = getPodStatus(row.original)
          return (
            <span className="text-muted-foreground text-sm">
              {status.restartString || '0'}
            </span>
          )
        },
      }),
      columnHelper.accessor((row) => row.status?.phase, {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = getPodStatus(row.original)
          return (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <PodStatusIcon status={status.reason} />
              {status.reason}
            </Badge>
          )
        },
      }),
      columnHelper.accessor((row) => row.metrics?.cpuUsage || 0, {
        id: 'cpu',
        header: 'CPU',
        cell: ({ row }) => (
          <MetricCell metrics={row.original.metrics} type="cpu" />
        ),
      }),
      columnHelper.accessor((row) => row.metrics?.memoryUsage || 0, {
        id: 'memory',
        header: 'Memory',
        cell: ({ row }) => (
          <MetricCell metrics={row.original.metrics} type="memory" />
        ),
      }),
      columnHelper.accessor((row) => row.status?.podIP, {
        id: 'ip',
        header: 'IP',
        cell: ({ getValue }) => {
          const ip = getValue() || '-'
          return (
            <span className="text-sm text-muted-foreground font-mono">
              {ip}
            </span>
          )
        },
      }),
      ...(hiddenNode
        ? []
        : [
            columnHelper.accessor((row) => row.spec?.nodeName, {
              id: 'node',
              header: 'Node',
              cell: ({ getValue }) => {
                const nodeName = getValue() || '-'
                return (
                  <Link
                    to={`/nodes/${nodeName}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {nodeName}
                  </Link>
                )
              },
            }),
          ]),
      columnHelper.accessor((row) => row.metadata?.creationTimestamp, {
        id: 'created',
        header: 'Created',
        cell: ({ getValue }) => {
          return (
            <span className="text-muted-foreground text-sm">
              {formatDate(getValue() || '', true)}
            </span>
          )
        },
      }),
    ],
    [columnHelper, hiddenNode]
  )

  const table = useReactTable({
    data: pods || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination,
    },
    getRowId: (row) => {
      const metadata = row.metadata
      if (!metadata?.name) {
        return `row-${Math.random()}`
      }
      return (
        metadata.uid ||
        (metadata.namespace
          ? `${metadata.namespace}/${metadata.name}`
          : metadata.name)
      )
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader className="animate-spin mr-2" />
        Loading pods...
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pods</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          onClick={header.column.getToggleSortingHandler()}
                          className={
                            header.column.getIsSorted()
                              ? 'text-primary'
                              : ''
                          }
                        >
                          {header.column.columnDef.header as string}
                          {header.column.getIsSorted() && (
                            <span className="ml-2">
                              {header.column.getIsSorted() === 'asc'
                                ? '↑'
                                : '↓'}
                            </span>
                          )}
                        </Button>
                      ) : (
                        header.column.columnDef.header as string
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground"
                  >
                    No pods found
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{' '}
                of {table.getFilteredRowModel().rows.length} entries
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: table.getPageCount() }, (_, i) => i + 1)
                    .filter((page) => {
                      const currentPage = table.getState().pagination.pageIndex + 1
                      return (
                        page === 1 ||
                        page === table.getPageCount() ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      )
                    })
                    .map((page, index, array) => {
                      const prevPage = array[index - 1]
                      const showEllipsis = prevPage && page - prevPage > 1

                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={
                              table.getState().pagination.pageIndex + 1 === page
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => table.setPageIndex(page - 1)}
                            className="min-w-[32px]"
                          >
                            {page}
                          </Button>
                        </div>
                      )
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
