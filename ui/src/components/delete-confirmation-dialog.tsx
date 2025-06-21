import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceName: string
  resourceType: string
  onConfirm: () => void
  isDeleting?: boolean
  namespace?: string
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  resourceName,
  resourceType,
  onConfirm,
  isDeleting = false,
  namespace,
}: DeleteConfirmationDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('')

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setConfirmationInput('')
    }
    onOpenChange(open)
  }

  const handleConfirm = () => {
    if (confirmationInput === resourceName) {
      onConfirm()
    }
  }

  const isConfirmDisabled = confirmationInput !== resourceName || isDeleting

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-left">
                Delete {resourceType}
              </DialogTitle>
              <DialogDescription className="text-left">
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-destructive/5 p-4 border border-destructive/20">
            <div className="text-sm">
              <p className="font-medium text-destructive mb-2">
                You are about to delete:
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  <span className="font-medium">Name:</span> {resourceName}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {resourceType}
                </p>
                {namespace && (
                  <p>
                    <span className="font-medium">Namespace:</span> {namespace}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className=" font-semibold">{resourceName}</span> to
              confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={resourceName}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleDialogChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
