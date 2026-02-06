import React, { useMemo, useState } from 'react'

import { Button } from './ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

interface Column<T> {
  header: string
  accessor: (item: T) => unknown
  cell: (value: unknown, item?: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

interface SimpleTableProps<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  pagination?: {
    enabled: boolean
    pageSize?: number
    showPageInfo?: boolean
    currentPage?: number
    onPageChange?: (page: number) => void
  }
}

type SortDirection = 'asc' | 'desc' | null

export function SimpleTable<T>({
  data,
  columns,
  emptyMessage = 'No data available',
  pagination,
}: SimpleTableProps<T>) {
  const isControlled =
    pagination &&
    typeof pagination.currentPage === 'number' &&
    typeof pagination.onPageChange === 'function'
  const [uncontrolledPage, setUncontrolledPage] = useState(1)
  const currentPage = isControlled ? pagination!.currentPage! : uncontrolledPage
  const setCurrentPage = isControlled
    ? pagination!.onPageChange!
    : setUncontrolledPage
  
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const paginationConfig = useMemo(
    () => ({
      enabled: pagination?.enabled ?? false,
      pageSize: pagination?.pageSize ?? 10,
      showPageInfo: pagination?.showPageInfo ?? true,
    }),
    [pagination]
  )

  const sortedData = useMemo(() => {
    if (sortColumn === null || sortDirection === null) {
      return data
    }

    const column = columns[sortColumn]
    if (!column || !column.sortable) {
      return data
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = column.accessor(a)
      const bValue = column.accessor(b)

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [data, sortColumn, sortDirection, columns])

  const { paginatedData, totalPages, startIndex, endIndex } = useMemo(() => {
    if (!paginationConfig.enabled) {
      return {
        paginatedData: sortedData,
        totalPages: 1,
        startIndex: 1,
        endIndex: sortedData.length,
      }
    }

    const { pageSize } = paginationConfig
    const totalPages = Math.ceil(sortedData.length / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, sortedData.length)
    const paginatedData = sortedData.slice(startIndex, endIndex)

    return {
      paginatedData,
      totalPages,
      startIndex: startIndex + 1,
      endIndex,
    }
  }, [sortedData, currentPage, paginationConfig])

  const handlePreviousPage = () => {
    if (isControlled) {
      setCurrentPage(Math.max(currentPage - 1, 1))
    } else {
      setUncontrolledPage(Math.max(currentPage - 1, 1))
    }
  }

  const handleNextPage = () => {
    if (isControlled) {
      setCurrentPage(Math.min(currentPage + 1, totalPages))
    } else {
      setUncontrolledPage(Math.min(currentPage + 1, totalPages))
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSort = (columnIndex: number) => {
    const column = columns[columnIndex]
    if (!column || !column.sortable) {
      return
    }

    if (sortColumn === columnIndex) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
        setCurrentPage(1)
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortColumn(null)
        setCurrentPage(1)
      }
    } else {
      setSortColumn(columnIndex)
      setSortDirection('asc')
      setCurrentPage(1)
    }
  }
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => {
              const isSortable = column.sortable ?? false
              const isSorted = sortColumn === index
              const isAsc = isSorted && sortDirection === 'asc'
              const isDesc = isSorted && sortDirection === 'desc'

              return (
                <TableHead
                  key={index}
                  className={
                    column.align === 'left'
                      ? 'text-left'
                      : column.align === 'right'
                        ? 'text-right'
                        : 'text-center'
                  }
                >
                  {isSortable ? (
                    <button
                      onClick={() => handleSort(index)}
                      className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                    >
                      <span>{column.header}</span>
                      <span className="text-muted-foreground">
                        {isAsc ? '↑' : isDesc ? '↓' : '⇅'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((item, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={colIndex}
                    className={
                      column.align === 'left'
                        ? 'text-left'
                        : column.align === 'right'
                          ? 'text-right'
                          : 'text-center'
                    }
                  >
                    {column.cell(column.accessor(item), item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {paginationConfig.enabled && sortedData.length > 0 && (
        <div className="flex items-center justify-between">
          {paginationConfig.showPageInfo && (
            <div className="text-sm text-muted-foreground">
              Showing {startIndex} - {endIndex} of {sortedData.length} entries
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  )
                })
                .map((page, index, array) => {
                  const prevPage = array[index - 1]
                  const showEllipsis = prevPage && page - prevPage > 1

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="min-w-[32px]"
                      >
                        {page}
                      </Button>
                    </React.Fragment>
                  )
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export type { Column }
