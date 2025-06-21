import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Namespace } from 'kubernetes-types/core/v1'
import { Box, Database, RotateCcw, Search, XCircle } from 'lucide-react'

import { ResourceType } from '@/types/api'
import { useResources, useSimplePagination } from '@/lib/api'
import { debounce } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface ResourcePaginationTableProps<T> {
  resourceType: ResourceType // Type for the API call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[]
  clusterScope?: boolean // If true, don't show namespace selector
  searchQueryFilter?: (item: T, query: string) => boolean // Custom filter function
  pageSize?: number // Number of items per page
  // Namespace-related props (only used when clusterScope is false)
  selectedNamespace?: string
  onNamespaceChange?: (namespace: string) => void
}

export function ResourcePaginationTable<T>({
  resourceType,
  columns,
  clusterScope = false,
  selectedNamespace,
  onNamespaceChange,
  searchQueryFilter,
  pageSize = 20,
}: ResourcePaginationTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')

  // Fetch namespaces only when not in cluster scope
  const namespaceQuery = useResources('namespaces')
  const namespaceData = !clusterScope ? namespaceQuery.data : undefined
  const isLoadingNamespaces = !clusterScope ? namespaceQuery.isLoading : false

  // Use the useSimplePagination hook
  const {
    items: data,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    remainingItems,
    isLoading,
    error,
    goToNextPage,
    goToPreviousPage,
    resetPagination,
  } = useSimplePagination(resourceType, selectedNamespace, pageSize)

  // Set initial namespace when namespaces are loaded
  useEffect(() => {
    if (
      !clusterScope &&
      !selectedNamespace &&
      namespaceData &&
      namespaceData.length > 0 &&
      onNamespaceChange
    ) {
      const storedNamespace = localStorage.getItem('selectedNamespace')
      if (storedNamespace) {
        onNamespaceChange(storedNamespace)
      } else {
        onNamespaceChange(namespaceData[0].metadata!.name!)
      }
    }
  }, [clusterScope, selectedNamespace, namespaceData, onNamespaceChange])

  // Initialize our debounced search function just once
  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedSearchQuery(value)
      }, 300),
    []
  )

  // Update debounced search query when input changes
  useEffect(() => {
    debouncedSetSearch(searchQuery)
  }, [searchQuery, debouncedSetSearch])

  // Reset pagination when filters change or namespace changes
  useEffect(() => {
    resetPagination()
  }, [columnFilters, debouncedSearchQuery, selectedNamespace, resetPagination])

  // Handle namespace change
  const handleNamespaceChange = useCallback(
    (value: string) => {
      if (onNamespaceChange) {
        localStorage.setItem('selectedNamespace', value)
        onNamespaceChange(value)
        // Reset search when changing namespace
        setSearchQuery('')
        setDebouncedSearchQuery('')
      }
    },
    [onNamespaceChange]
  )

  // Add namespace column when showing all namespaces
  const enhancedColumns = useMemo(() => {
    if (!clusterScope && selectedNamespace === '_all') {
      // Add namespace column as the second column (after name)
      const namespaceColumn = {
        id: 'namespace',
        header: 'Namespace',
        accessorFn: (row: T) => {
          // Try to get namespace from metadata.namespace
          const metadata = (row as { metadata?: { namespace?: string } })
            ?.metadata
          return metadata?.namespace || '-'
        },
        cell: ({ getValue }: { getValue: () => string }) => (
          <Badge variant="outline" className="ml-2 ">
            {getValue()}
          </Badge>
        ),
      }

      // Insert namespace column after the first column (typically name)
      const newColumns = [...columns]
      newColumns.splice(0, 0, namespaceColumn)
      return newColumns
    }
    return columns
  }, [columns, clusterScope, selectedNamespace])

  // Memoize data to prevent unnecessary re-renders
  const memoizedData = useMemo(() => data || [], [data])

  // Create table instance using TanStack Table
  const table = useReactTable({
    data: memoizedData as T[],
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      globalFilter: debouncedSearchQuery, // Use debounced query for filtering
    },
    // For pagination table, we handle pagination via the hook
    manualPagination: true,
    // Improve filtering performance and consistency
    globalFilterFn: (row, _columnId, value) => {
      if (searchQueryFilter) {
        return searchQueryFilter(row.original, String(value).toLowerCase())
      }
      const searchValue = String(value).toLowerCase()

      // Search across all visible columns
      return row.getVisibleCells().some((cell) => {
        const cellValue = String(cell.getValue() || '').toLowerCase()
        return cellValue.includes(searchValue)
      })
    },
  })

  // Calculate filtered row counts for current page
  const totalRowCount = useMemo(() => data?.length || 0, [data])
  const filteredRowCount = useMemo(() => {
    if (!data || data.length === 0) return 0
    // Force re-computation when filters change
    void debouncedSearchQuery // Ensure dependency is used
    void columnFilters // Ensure dependency is used
    return table.getFilteredRowModel().rows.length
  }, [table, data, debouncedSearchQuery, columnFilters])

  // Calculate total count and pages for pagination display
  // For server-side pagination, we estimate total based on current progress
  const actualTotalCount = useMemo(() => {
    const currentPageCount = data?.length || 0
    if (currentPage === 0 && !hasNextPage) {
      // First page and no more pages - total is just current page count
      return currentPageCount
    }
    if (hasNextPage) {
      // There are more pages - estimate minimum total
      // We know we have at least (currentPage + 1) * pageSize items from seen pages
      // Plus at least 1 more item on the next page
      const seenItems = (currentPage + 1) * pageSize
      return seenItems + Math.max(1, remainingItems || 0)
    } else {
      // No more pages - total is (currentPage * pageSize) + current page count
      return currentPage * pageSize + currentPageCount
    }
  }, [currentPage, data?.length, hasNextPage, remainingItems, pageSize])

  const totalPages = useMemo(() => {
    if (hasNextPage) {
      // If there are more pages, show at least currentPage + 2
      return Math.max(currentPage + 2, Math.ceil(actualTotalCount / pageSize))
    } else {
      // No more pages - calculate exact total pages
      return currentPage + 1
    }
  }, [currentPage, hasNextPage, actualTotalCount, pageSize])

  // Check if there are active filters
  const hasActiveFilters = useMemo(() => {
    return Boolean(debouncedSearchQuery) || columnFilters.length > 0
  }, [debouncedSearchQuery, columnFilters])

  // Render empty state based on condition
  const renderEmptyState = () => {
    // Only show loading state if there's no existing data
    if (isLoading && (!data || data.length === 0)) {
      return (
        <div className="h-72 flex flex-col items-center justify-center">
          <div className="mb-4 bg-muted/30 p-6 rounded-full">
            <Database className="h-12 w-12 text-muted-foreground animate-pulse" />
          </div>
          <h3 className="text-lg font-medium mb-1">
            Loading {resourceType.toLowerCase()}...
          </h3>
          <p className="text-muted-foreground">
            Retrieving data
            {!clusterScope && selectedNamespace
              ? ` from ${selectedNamespace === '_all' ? 'All Namespaces' : `namespace ${selectedNamespace}`}`
              : ''}
          </p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="h-72 flex flex-col items-center justify-center">
          <div className="mb-4 text-red-500">
            <XCircle className="h-16 w-16" />
          </div>
          <h3 className="text-lg font-medium text-red-500 mb-1">
            Error loading {resourceType.toLowerCase()}
          </h3>
          <p className="text-muted-foreground mb-4">
            {(error as Error).message}
          </p>
          <Button variant="outline" onClick={() => resetPagination()}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      )
    }

    if (data && data.length === 0) {
      return (
        <div className="h-72 flex flex-col items-center justify-center">
          <div className="mb-4 bg-muted/30 p-6 rounded-full">
            <Box className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">
            No {resourceType.toLowerCase()} found
          </h3>
          <p className="text-muted-foreground">
            {debouncedSearchQuery
              ? `No results match your search query: "${debouncedSearchQuery}"`
              : clusterScope
                ? `There are no ${resourceType.toLowerCase()} found`
                : `There are no ${resourceType.toLowerCase()} in the ${selectedNamespace} namespace`}
          </p>
          {debouncedSearchQuery && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          )}
        </div>
      )
    }

    return null
  }

  // Render table rows
  const renderRows = () => {
    // Get the filtered rows
    const rows = table.getRowModel().rows

    if (rows.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={enhancedColumns.length}
            className="h-24 text-center"
          >
            No results.
          </TableCell>
        </TableRow>
      )
    }

    return rows.map((row) => (
      <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className="align-middle text-center">
            {cell.column.columnDef.cell
              ? flexRender(cell.column.columnDef.cell, cell.getContext())
              : String(cell.getValue() || '-')}
          </TableCell>
        ))}
      </TableRow>
    ))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold capitalize">{resourceType}</h1>
          {!clusterScope &&
            !isLoadingNamespaces &&
            selectedNamespace &&
            selectedNamespace !== '_all' && (
              <div className="text-muted-foreground flex items-center mt-1">
                <span>Namespace:</span>
                <Badge variant="outline" className="ml-2 ">
                  {selectedNamespace}
                </Badge>
              </div>
            )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {!clusterScope && !isLoadingNamespaces && namespaceData && (
              <Select
                value={selectedNamespace}
                onValueChange={handleNamespaceChange}
              >
                <SelectTrigger className="min-w-48">
                  <SelectValue placeholder="Select a namespace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all" value="_all">
                    All Namespaces
                  </SelectItem>
                  {namespaceData?.map((ns: Namespace) => (
                    <SelectItem
                      key={ns.metadata!.name}
                      value={ns.metadata!.name!}
                    >
                      {ns.metadata!.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Column Filters */}
            {table
              .getAllColumns()
              .filter((column) => {
                const columnDef = column.columnDef as ColumnDef<T> & {
                  enableColumnFilter?: boolean
                }
                return columnDef.enableColumnFilter && column.getCanFilter()
              })
              .map((column) => {
                const columnDef = column.columnDef as ColumnDef<T> & {
                  enableColumnFilter?: boolean
                }
                const uniqueValues = column.getFacetedUniqueValues()
                const filterValue = column.getFilterValue() as string

                return (
                  <Select
                    key={column.id}
                    value={filterValue || ''}
                    onValueChange={(value) =>
                      column.setFilterValue(value === 'all' ? '' : value)
                    }
                  >
                    <SelectTrigger className="min-w-32">
                      <SelectValue
                        placeholder={`Filter ${typeof columnDef.header === 'string' ? columnDef.header : 'Column'}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All{' '}
                        {typeof columnDef.header === 'string'
                          ? columnDef.header
                          : 'Values'}
                      </SelectItem>
                      {Array.from(uniqueValues.keys())
                        .sort()
                        .map((value) => (
                          <SelectItem key={String(value)} value={String(value)}>
                            {String(value)} ({uniqueValues.get(value)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )
              })}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${resourceType.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 w-full sm:w-[200px] md:w-[300px]"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="h-9 w-9"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator for refetch */}
      {isLoading && data && data.length > 0 && (
        <div className="flex items-center justify-center py-2 bg-muted/20 rounded-md">
          <Database className="h-4 w-4 text-muted-foreground animate-pulse mr-2" />
          <span className="text-sm text-muted-foreground">
            Updating {resourceType.toLowerCase()}...
          </span>
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-lg border">
        <div
          className={`rounded-md transition-opacity duration-200 ${
            isLoading && data && data.length > 0 ? 'opacity-75' : 'opacity-100'
          }`}
        >
          {renderEmptyState() || (
            <>
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="text-center">
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
                              {
                                header.column.columnDef
                                  .header as React.ReactNode
                              }
                              {header.column.getIsSorted() && (
                                <span className="ml-2">
                                  {header.column.getIsSorted() === 'asc'
                                    ? '↑'
                                    : '↓'}
                                </span>
                              )}
                            </Button>
                          ) : (
                            (header.column.columnDef.header as React.ReactNode)
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {renderRows()}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* Pagination with memoized calculations */}
      {data && data.length > 0 && (
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {hasActiveFilters ? (
              <>
                Showing {filteredRowCount} of {totalRowCount} row(s)
                {debouncedSearchQuery && (
                  <span className="ml-1">
                    (filtered by "{debouncedSearchQuery}")
                  </span>
                )}
              </>
            ) : (
              `${actualTotalCount} row(s) total.`
            )}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {currentPage + 1} of {totalPages}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={goToPreviousPage}
                disabled={!hasPreviousPage || isLoading}
              >
                <span className="sr-only">Go to previous page</span>←
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={goToNextPage}
                disabled={!hasNextPage || isLoading}
              >
                <span className="sr-only">Go to next page</span>→
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
