import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Role } from '@/types/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role | null
  onAssign: (
    roleId: number,
    subjectType: 'user' | 'group',
    subject: string
  ) => void
  onUnassign: (
    roleId: number,
    subjectType: 'user' | 'group',
    subject: string
  ) => void
}

export function RBACAssignmentDialog({
  open,
  onOpenChange,
  role,
  onAssign,
  onUnassign,
}: Props) {
  const { t } = useTranslation()
  const [subjectType, setSubjectType] = useState<'user' | 'group'>('user')
  const [subject, setSubject] = useState('')

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    onAssign(role.id, subjectType, subject)
  }

  const handleUnassign = () => {
    if (!role) return
    onUnassign(role.id, subjectType, subject)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('rbac.assign.title', 'Assign Role')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAssign} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('rbac.assign.subjectType', 'Subject Type')}</Label>
            <Select
              value={subjectType}
              onValueChange={(v) => setSubjectType(v as 'user' | 'group')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  {t('rbac.assign.user', 'User')}
                </SelectItem>
                <SelectItem value="group">
                  {t('rbac.assign.group', 'OIDC Group')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('rbac.assign.subject', 'Subject')}</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t(
                'rbac.assign.subjectPlaceholder',
                'username or group name'
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={handleUnassign}
              >
                {t('rbac.actions.unassign', 'Unassign')}
              </Button>
              <Button type="submit">
                {t('rbac.actions.assign', 'Assign')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RBACAssignmentDialog
