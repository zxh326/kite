import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Role } from '@/types/api'
import { assignRole, unassignRole, useRoleList } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: { username: string }
}

export function UserRoleAssignment({ open, onOpenChange, user }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: roles = [] } = useRoleList()
  const [selected, setSelected] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!user || !roles) return
    const mapping: Record<number, boolean> = {}
    roles.forEach((r) => {
      const has = r.assignments?.some(
        (a) => a.subjectType === 'user' && a.subject === user.username
      )
      mapping[r.id] = !!has
    })
    setSelected(mapping)
  }, [user, roles])

  const toggle = async (roleId: number) => {
    if (!user) return
    try {
      if (selected[roleId]) {
        await unassignRole(roleId, 'user', user.username)
        toast.success(t('rbac.messages.unassigned', 'Unassigned'))
      } else {
        await assignRole(roleId, {
          subjectType: 'user',
          subject: user.username,
        })
        toast.success(t('rbac.messages.assigned', 'Assigned'))
      }
      queryClient.invalidateQueries({ queryKey: ['user-list'] })
      queryClient.invalidateQueries({ queryKey: ['role-list'] })
      setSelected((s) => ({ ...s, [roleId]: !s[roleId] }))
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t('rbac.messages.assignError', 'Failed to assign')
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('userManagement.dialog.assignRoles', 'Assign Roles')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {roles.map((r: Role) => (
            <div key={r.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{r.name}</div>
                {r.description && (
                  <div className="text-sm text-muted-foreground">
                    {r.description}
                  </div>
                )}
              </div>
              <div>
                <Checkbox
                  checked={!!selected[r.id]}
                  onCheckedChange={() => toggle(r.id)}
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UserRoleAssignment
