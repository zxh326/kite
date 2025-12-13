import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  IconFilter,
  IconRefresh,
  IconCheck,
  IconX,
  IconUser,
  IconClock,
} from '@tabler/icons-react'

import { fetchAuditLogs, fetchAuditStats } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { ResourceHistory } from '@/types/api'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { YamlDiffViewer } from '@/components/yaml-diff-viewer'

export function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [selectedEntry, setSelectedEntry] = useState<ResourceHistory | null>(
    null
  )
  const [isDiffOpen, setIsDiffOpen] = useState(false)
  const [isRollingBack] = useState(false)

  // Filters
  const [resourceType, setResourceType] = useState('all')
  const [namespace, setNamespace] = useState('')
  const [operationType, setOperationType] = useState('all')
  const [username, setUsername] = useState('')
  const [success, setSuccess] = useState('all')

  // Build query params
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })
  if (resourceType && resourceType !== 'all') queryParams.append('resourceType', resourceType)
  if (namespace) queryParams.append('namespace', namespace)
  if (operationType && operationType !== 'all') queryParams.append('operationType', operationType)
  if (username) queryParams.append('username', username)
  if (success && success !== 'all') queryParams.append('success', success)

  // Fetch audit logs
  const {
    data: auditData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ['audit-logs', queryParams.toString()],
    queryFn: () => fetchAuditLogs(queryParams),
    staleTime: 10000,
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => fetchAuditStats(),
    staleTime: 30000,
  })

  const handleViewDiff = (entry: ResourceHistory) => {
    setSelectedEntry(entry)
    setIsDiffOpen(true)
  }

  const handleRefresh = () => {
    refetch()
  }

  const handleResetFilters = () => {
    setResourceType('all')
    setNamespace('')
    setOperationType('all')
    setUsername('')
    setSuccess('all')
    setPage(1)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Centralized audit trail of all resource operations
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <IconRefresh className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.successRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Last 24 Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last24Hours}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Top Operation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byOperationType && stats.byOperationType.length > 0
                  ? stats.byOperationType[0].operationType
                  : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <IconFilter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="deployments">Deployments</SelectItem>
                  <SelectItem value="statefulsets">StatefulSets</SelectItem>
                  <SelectItem value="daemonsets">DaemonSets</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="configmaps">ConfigMaps</SelectItem>
                  <SelectItem value="secrets">Secrets</SelectItem>
                  <SelectItem value="pods">Pods</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Namespace</Label>
              <Input
                placeholder="All namespaces"
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operationType} onValueChange={setOperationType}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="patch">Patch</SelectItem>
                  <SelectItem value="apply">Apply</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>User</Label>
              <Input
                placeholder="All users"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={success} onValueChange={setSuccess}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleResetFilters} variant="outline" size="sm">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !auditData?.data || auditData.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit entries found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Namespace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditData.data.map((entry: ResourceHistory) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        <div className="flex items-center">
                          <IconClock className="w-3 h-3 mr-1" />
                          {formatDate(entry.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <IconUser className="w-3 h-3 mr-1" />
                          <span className="text-xs">
                            {entry.operator?.username || `User ${entry.operatorId}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.operationType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {entry.resourceType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.resourceName}
                      </TableCell>
                      <TableCell>{entry.namespace || '-'}</TableCell>
                      <TableCell>
                        {entry.success ? (
                          <div className="flex items-center text-green-600">
                            <IconCheck className="w-4 h-4 mr-1" />
                            Success
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <IconX className="w-4 h-4 mr-1" />
                            Failed
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDiff(entry)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to{' '}
                  {Math.min(page * pageSize, auditData.pagination.total)} of{' '}
                  {auditData.pagination.total} entries
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= auditData.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Diff Dialog */}
      {selectedEntry && (
        <YamlDiffViewer
          original={selectedEntry.previousYaml || ''}
          modified={selectedEntry.resourceYaml || ''}
          open={isDiffOpen}
          onOpenChange={setIsDiffOpen}
          isRollingBack={isRollingBack}
          title={`${selectedEntry.operationType.toUpperCase()} - ${selectedEntry.resourceType}/${selectedEntry.resourceName}`}
        />
      )}
    </div>
  )
}
