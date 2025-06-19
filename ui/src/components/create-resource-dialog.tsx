import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { applyResource } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { SimpleYamlEditor } from '@/components/simple-yaml-editor'

interface CreateResourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateResourceDialog({
  open,
  onOpenChange,
}: CreateResourceDialogProps) {
  const [yaml, setYaml] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!yaml.trim()) {
      toast.error('Please enter YAML content')
      return
    }

    setIsLoading(true)
    try {
      const result = await applyResource(yaml)
      toast.success(
        `Resource ${result.kind}/${result.name} created successfully`
      )
      setYaml('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating resource:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to create resource'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setYaml('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-4xl sm:!max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Resource</DialogTitle>
          <DialogDescription>
            Paste any Kubernetes resource YAML configuration and apply it to the
            cluster
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="yaml">YAML Configuration</Label>
            <SimpleYamlEditor
              value={yaml}
              onChange={(value) => setYaml(value || '')}
              disabled={isLoading}
              height="400px"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !yaml.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
