import { useState } from 'react'
import { IconEdit, IconPlus, IconServer, IconTrash } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Cluster } from '@/types/api'
import {
  ClusterCreateRequest,
  ClusterUpdateRequest,
  createCluster,
  deleteCluster,
  updateCluster,
  useClusterList,
} from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'

import { ClusterDialog } from './cluster-dialog'

export function ClusterManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // Use real API to fetch clusters
  const { data: clusters = [], isLoading, error } = useClusterList()

  const [showClusterDialog, setShowClusterDialog] = useState(false)
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null)
  const [deletingCluster, setDeletingCluster] = useState<Cluster | null>(null)

  // Create cluster mutation
  const createMutation = useMutation({
    mutationFn: createCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster-list'] })
      toast.success(
        t('clusterManagement.messages.created', 'Cluster created successfully')
      )
      setShowClusterDialog(false)
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t(
            'clusterManagement.messages.createError',
            'Failed to create cluster'
          )
      )
    },
  })

  // Update cluster mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClusterUpdateRequest }) =>
      updateCluster(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster-list'] })
      toast.success(
        t('clusterManagement.messages.updated', 'Cluster updated successfully')
      )
      setShowClusterDialog(false)
      setEditingCluster(null)
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t(
            'clusterManagement.messages.updateError',
            'Failed to update cluster'
          )
      )
    },
  })

  // Delete cluster mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cluster-list'] })
      toast.success(
        t('clusterManagement.messages.deleted', 'Cluster deleted successfully')
      )
      setDeletingCluster(null)
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t(
            'clusterManagement.messages.deleteError',
            'Failed to delete cluster'
          )
      )
    },
  })

  const handleSubmitCluster = (clusterData: ClusterCreateRequest) => {
    if (editingCluster) {
      // Update existing cluster - use the form data directly
      updateMutation.mutate({
        id: editingCluster.id,
        data: clusterData,
      })
    } else {
      // Create new cluster
      createMutation.mutate(clusterData)
    }
  }

  const handleDeleteCluster = () => {
    if (!deletingCluster) return
    deleteMutation.mutate(deletingCluster.id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">
          {t('clusterManagement.errors.loadFailed', 'Failed to load clusters')}
        </div>
      </div>
    )
  }

  const getClusterTypeBadge = (cluster: Cluster) => {
    if (cluster.inCluster) {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          {t('clusterManagement.type.inCluster', 'In-Cluster')}
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-gray-50 text-gray-700 border-gray-200"
      >
        {t('clusterManagement.type.external', 'External')}
      </Badge>
    )
  }

  const getStatusBadge = (cluster: Cluster) => {
    if (!cluster.enabled) {
      return (
        <Badge variant="secondary">
          {t('clusterManagement.status.disabled', 'Disabled')}
        </Badge>
      )
    }
    return (
      <Badge variant="default">
        {t('clusterManagement.status.enabled', 'Enabled')}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconServer className="h-5 w-5" />
                {t('clusterManagement.title', 'Cluster Management')}
              </CardTitle>
            </div>
            <Button
              onClick={() => {
                setEditingCluster(null)
                setShowClusterDialog(true)
              }}
              className="gap-2"
            >
              <IconPlus className="h-4 w-4" />
              {t('clusterManagement.actions.add', 'Add Cluster')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t('clusterManagement.table.name', 'Name')}
                  </TableHead>
                  <TableHead>
                    {t('clusterManagement.table.type', 'Type')}
                  </TableHead>
                  <TableHead>
                    {t('clusterManagement.table.status', 'Status')}
                  </TableHead>
                  <TableHead>
                    {t('clusterManagement.table.prometheus', 'Prometheus')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('clusterManagement.table.actions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map((cluster) => (
                  <TableRow key={cluster.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cluster.name}</span>
                          {cluster.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                          {cluster.version && (
                            <Badge variant="secondary">{cluster.version}</Badge>
                          )}
                        </div>
                        {cluster.description && (
                          <div className="text-sm text-muted-foreground">
                            {cluster.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getClusterTypeBadge(cluster)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(cluster)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {cluster.prometheusURL ? 'Yes' : 'No'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            •••
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingCluster(cluster)
                              setShowClusterDialog(true)
                            }}
                            className="gap-2"
                          >
                            <IconEdit className="h-4 w-4" />
                            {t('clusterManagement.actions.edit', 'Edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingCluster(cluster)}
                            disabled={cluster.isDefault}
                            className="gap-2 text-destructive"
                          >
                            <IconTrash className="h-4 w-4" />
                            {t('clusterManagement.actions.delete', 'Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {clusters.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <IconServer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {t('clusterManagement.empty.title', 'No clusters configured')}
              </p>
              <p className="text-sm mt-1">
                {t(
                  'clusterManagement.empty.description',
                  'Add your first cluster to get started'
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cluster Dialog (Add/Edit) */}
      <ClusterDialog
        open={showClusterDialog}
        onOpenChange={(open) => {
          setShowClusterDialog(open)
          if (!open) {
            setEditingCluster(null)
          }
        }}
        cluster={editingCluster}
        onSubmit={handleSubmitCluster}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!deletingCluster}
        onOpenChange={() => setDeletingCluster(null)}
        onConfirm={handleDeleteCluster}
        resourceName={deletingCluster?.name || ''}
        resourceType="cluster"
        additionalNote={t(
          'clusterManagement.deleteConfirmation',
          "This action will only remove the current cluster's configuration in kite and will not delete any cluster resources."
        )}
      />
    </div>
  )
}
