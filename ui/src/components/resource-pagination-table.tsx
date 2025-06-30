import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Namespace } from 'kubernetes-types/core/v1'
import { Box, Database, RotateCcw, Search, XCircle } from 'lucide-react'

import { ResourceType } from '@/types/api'
import { useOffsetPaginatedResources, useResources } from '@/lib/api'
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
  pageSize = 5,
}: ResourcePaginationTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('')

  // Fetch namespaces only when not in cluster scope
  const namespaceQuery = useResources('namespaces')
  const namespaceData = !clusterScope ? namespaceQuery.data : undefined
  const isLoadingNamespaces = !clusterScope ? namespaceQuery.isLoading : false

  // Convert column filters to fieldSelector format for backend filtering
  const fieldSelector = useMemo(() => {
    if (columnFilters.length === 0) return undefined

    const fieldSelectors = columnFilters.map(filter => {
      const { id, value } = filter
      if (!value || value === '') return null

      // Map UI column IDs to Kubernetes field names
      let fieldName: string
      switch (id) {
        case 'status':
          fieldName = 'status.phase'
          break
        case 'namespace':
          fieldName = 'metadata.namespace'
          break
        case 'name':
          fieldName = 'metadata.name'
          break
        default:
          // For other fields, try to map to metadata fields or use as-is
          if (id.includes('.')) {
            fieldName = id // Already in field selector format
          } else {
            fieldName = `metadata.${id}` // Assume it's a metadata field
          }
      }

      return `${fieldName}=${value}`
    }).filter(Boolean)

    return fieldSelectors.length > 0 ? fieldSelectors.join(',') : undefined
  }, [columnFilters])

  // Convert sorting state to backend format
  const sortBy = useMemo(() => {
    if (sorting.length === 0) return undefined

    const sortSpecs = sorting.map(sort => {
      const direction = sort.desc ? 'desc' : 'asc'
      return `${sort.id}:${direction}`
    })

    const result = sortSpecs.join(',')
    console.log('Sorting state:', sorting)
    console.log('SortBy parameter:', result)
    return result
  }, [sorting])

  // Use the useOffsetPaginatedResources hook for offset/limit pagination
  const {
    items: data,
    page: currentPage,
    totalPages,
    totalCount: actualTotalCount,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetPagination,
  } = useOffsetPaginatedResources(resourceType, selectedNamespace, pageSize, {
    refreshInterval: 5000, // Refresh every 5 seconds
    fieldSelector,
    sortBy,
  })

  // Memoize data to prevent unnecessary re-renders and validate structure
  const memoizedData = useMemo(() => {
    if (!data) {
      return []
    }

    if (!Array.isArray(data)) {
      return []
    }

    return data
  }, [data])

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
  }, [fieldSelector, sortBy, debouncedSearchQuery, selectedNamespace, resetPagination])

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

  // Create table instance using TanStack Table
  const table = useReactTable({
    data: memoizedData as T[],
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    // Use manual pagination, filtering, and sorting since backend handles these
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      globalFilter: debouncedSearchQuery, // Use debounced query for client-side search
    },
    // Custom global filter for search (still client-side since backend doesn't handle search yet)
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

  // Calculate filtered row counts - now using backend total count
  const totalRowCount = useMemo(() => actualTotalCount || 0, [actualTotalCount])
  const filteredRowCount = useMemo(() => {
    // For search filtering (client-side), count filtered rows
    if (debouncedSearchQuery && memoizedData) {
      return table.getFilteredRowModel().rows.length
    }
    // For backend filtering, use the total count from backend
    return actualTotalCount || 0
  }, [table, memoizedData, debouncedSearchQuery, actualTotalCount])

  // Check if there are active filters - now based on backend parameters
  const hasActiveFilters = useMemo(() => {
    return Boolean(debouncedSearchQuery) || Boolean(fieldSelector)
  }, [debouncedSearchQuery, fieldSelector])

  // Render empty state based on condition
  const renderEmptyState = () => {
    // Only show loading state if there's no existing data
    if (isLoading && (!memoizedData || memoizedData.length === 0)) {
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

    // Only show empty state if we're not loading and have no data at all
    if (!isLoading && (!memoizedData || memoizedData.length === 0)) {
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
    // Get the filtered rows from TanStack Table
    const rows = table.getRowModel().rows

    if (rows.length === 0) {
      // Show "No results" only if we have data but filtering resulted in no rows
      if (memoizedData && memoizedData.length > 0) {
        return (
          <TableRow>
            <TableCell
              colSpan={enhancedColumns.length}
              className="h-24 text-center"
            >
              No results match the current filters.
            </TableCell>
          </TableRow>
        )
      }
      // If no data at all, this should be handled by renderEmptyState
      return null
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

            {/* Column Filters - Temporarily disabled since we use backend filtering */}
            {/* TODO: Implement proper column filter options from backend schema or predefined values */}
            {false && table
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
                // Since we removed getFacetedUniqueValues, we'd need to provide 
                // predefined filter options or fetch them from the backend
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
                      {/* Would need predefined options here */}
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
      {isLoading && memoizedData && memoizedData.length > 0 && (
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
          className={`rounded-md transition-opacity duration-200 ${isLoading && data && data.length > 0 ? 'opacity-75' : 'opacity-100'
            }`}
        >
          {/* Show empty state only if there's absolutely no data */}
          {!memoizedData || memoizedData.length === 0 ? (
            renderEmptyState()
          ) : (
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
      {memoizedData && memoizedData.length > 0 && (
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
              `Total: ${actualTotalCount} row(s), showing page ${currentPage} of ${totalPages}`
            )}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {currentPage} of {totalPages}
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

              {/* Page number select for jumping to specific page */}
              <div className="flex items-center gap-1">
                <Select
                  value={currentPage.toString()}
                  onValueChange={(value) => {
                    const pageNum = parseInt(value)
                    if (pageNum >= 1 && pageNum <= totalPages) {
                      goToPage(pageNum)
                    }
                  }}
                >
                  <SelectTrigger className="w-16 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <SelectItem key={page} value={page.toString()}>
                        {page}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
