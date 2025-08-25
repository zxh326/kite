import { useState } from 'react'
import {
  IconEdit,
  IconPlus,
  IconShieldCheck,
  IconTrash,
} from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Role } from '@/types/api'
import {
  assignRole,
  createRole,
  deleteRole,
  unassignRole,
  updateRole,
  useRoleList,
} from '@/lib/api'
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

import { Badge } from '../ui/badge'
import { RBACAssignmentDialog } from './rbac-assignment-dialog'
import { RBACDialog } from './rbac-dialog'

export function RBACManagement() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: roles = [], isLoading, error } = useRoleList()

  const [showDialog, setShowDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assigningRole, setAssigningRole] = useState<Role | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: Partial<Role>) => createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-list'] })
      toast.success(t('rbac.messages.created', 'Role created'))
      setShowDialog(false)
    },
    onError: (err: Error) =>
      toast.error(
        err.message || t('rbac.messages.createError', 'Failed to create role')
      ),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Role> }) =>
      updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-list'] })
      toast.success(t('rbac.messages.updated', 'Role updated'))
      setShowDialog(false)
      setEditingRole(null)
    },
    onError: (err: Error) =>
      toast.error(
        err.message || t('rbac.messages.updateError', 'Failed to update role')
      ),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-list'] })
      toast.success(t('rbac.messages.deleted', 'Role deleted'))
      setDeletingRole(null)
    },
    onError: (err: Error) =>
      toast.error(
        err.message || t('rbac.messages.deleteError', 'Failed to delete role')
      ),
  })

  const handleSubmitRole = (data: Partial<Role>) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleDeleteRole = () => {
    if (!deletingRole) return
    deleteMutation.mutate(deletingRole.id)
  }

  const handleAssign = async (
    roleId: number,
    subjectType: 'user' | 'group',
    subject: string
  ) => {
    try {
      await assignRole(roleId, { subjectType, subject })
      queryClient.invalidateQueries({ queryKey: ['role-list'] })
      toast.success(t('rbac.messages.assigned', 'Assigned'))
      setShowAssignDialog(false)
      setAssigningRole(null)
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t('rbac.messages.assignError', 'Failed to assign')
      )
    }
  }

  const handleUnassign = async (
    roleId: number,
    subjectType: 'user' | 'group',
    subject: string
  ) => {
    try {
      await unassignRole(roleId, subjectType, subject)
      queryClient.invalidateQueries({ queryKey: ['role-list'] })
      toast.success(t('rbac.messages.unassigned', 'Unassigned'))
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t('rbac.messages.unassignError', 'Failed to unassign')
      )
    }
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
          {t('rbac.errors.loadFailed', 'Failed to load roles')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconShieldCheck className="h-5 w-5" />
                {t('rbac.title', 'Role Management')}
              </CardTitle>
            </div>
            <Button
              onClick={() => {
                setEditingRole(null)
                setShowDialog(true)
              }}
              className="gap-2"
            >
              <IconPlus className="h-4 w-4" />
              {t('rbac.actions.add', 'Add Role')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('rbac.table.name', 'Name')}</TableHead>
                  <TableHead>{t('rbac.table.clusters', 'Clusters')}</TableHead>
                  <TableHead>
                    {t('rbac.table.namespaces', 'Namespaces')}
                  </TableHead>
                  <TableHead>
                    {t('rbac.table.resources', 'Resources')}
                  </TableHead>
                  <TableHead>{t('rbac.table.verbs', 'Verbs')}</TableHead>
                  <TableHead className="text-right">
                    {t('rbac.table.actions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium">{r.name}</span>{' '}
                          {r.isSystem && (
                            <Badge variant="secondary">System</Badge>
                          )}
                        </div>
                        {r.description && (
                          <div className="text-sm text-muted-foreground">
                            {r.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {r.clusters.length > 0 ? (
                          r.clusters.join(', ')
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {r.namespaces.length > 0 ? (
                          r.namespaces.join(', ')
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {r.resources.length > 0 ? (
                          r.resources.join(', ')
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {r.verbs.length > 0 ? (
                          r.verbs.join(', ')
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
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
                            disabled={r.isSystem}
                            onClick={() => {
                              setEditingRole(r)
                              setShowDialog(true)
                            }}
                            className="gap-2"
                          >
                            <IconEdit className="h-4 w-4" />
                            {t('rbac.actions.edit', 'Edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAssigningRole(r)
                              setShowAssignDialog(true)
                            }}
                            className="gap-2"
                          >
                            <IconShieldCheck className="h-4 w-4" />
                            {t('rbac.actions.assign', 'Assign')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={r.isSystem}
                            onClick={() => setDeletingRole(r)}
                            className="gap-2 text-destructive"
                          >
                            <IconTrash className="h-4 w-4" />
                            {t('rbac.actions.delete', 'Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {roles.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <IconShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('rbac.empty.title', 'No roles configured')}</p>
              <p className="text-sm mt-1">
                {t(
                  'rbac.empty.description',
                  'Create roles to grant permissions'
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <RBACDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open)
          if (!open) setEditingRole(null)
        }}
        role={editingRole}
        onSubmit={handleSubmitRole}
      />

      <RBACAssignmentDialog
        open={showAssignDialog}
        onOpenChange={(open) => {
          setShowAssignDialog(open)
          if (!open) setAssigningRole(null)
        }}
        role={assigningRole}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
      />

      <DeleteConfirmationDialog
        open={!!deletingRole}
        onOpenChange={() => setDeletingRole(null)}
        onConfirm={handleDeleteRole}
        resourceName={deletingRole?.name || ''}
        resourceType="role"
      />
    </div>
  )
}

export default RBACManagement
