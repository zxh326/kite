import { useEffect, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { Pod } from 'kubernetes-types/core/v1'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/lib/api-client'
import { translateError } from '@/lib/utils'
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

interface PortForwardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pod: Pod
}

export function PortForwardDialog({
  open,
  onOpenChange,
  pod,
}: PortForwardDialogProps) {
  const { t } = useTranslation()
  const [ports, setPorts] = useState([{ localPort: '', podPort: '' }])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const containerPorts =
    pod.spec?.containers
      .flatMap((c) => c.ports || [])
      .map((p) => p.containerPort) || []

  useEffect(() => {
    if (open) {
      // Reset ports when dialog opens
      setPorts([{ localPort: '', podPort: '' }])
    }
  }, [open])

  const handlePortChange = (index: number, field: string, value: string) => {
    const newPorts = [...ports]
    newPorts[index] = { ...newPorts[index], [field]: value }
    setPorts(newPorts)
  }

  const handleAddPort = () => {
    setPorts([...ports, { localPort: '', podPort: '' }])
  }

  const handleRemovePort = (index: number) => {
    const newPorts = ports.filter((_, i) => i !== index)
    setPorts(newPorts)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const portMappings = ports.map(
        ({ localPort, podPort }) => `${localPort}:${podPort}`
      )
      const response = await apiClient.post<{ message: string }>(
        `/pods/${pod.metadata?.namespace}/${pod.metadata?.name}/portforward`,
        { ports: portMappings }
      )
      toast.success(response.message)
      onOpenChange(false)
    } catch (error) {
      toast.error(translateError(error, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Port Forward</DialogTitle>
          <DialogDescription>
            Forward one or more ports from this pod to your local machine.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {ports.map((port, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`localPort-${index}`}>Local Port</Label>
                  <Input
                    id={`localPort-${index}`}
                    value={port.localPort}
                    onChange={(e) =>
                      handlePortChange(index, 'localPort', e.target.value)
                    }
                    placeholder="e.g. 8080"
                  />
                </div>
                <div>
                  <Label htmlFor={`podPort-${index}`}>Pod Port</Label>
                  <Input
                    id={`podPort-${index}`}
                    value={port.podPort}
                    onChange={(e) =>
                      handlePortChange(index, 'podPort', e.target.value)
                    }
                    placeholder="e.g. 80"
                    list={`podPorts-${index}`}
                  />
                  <datalist id={`podPorts-${index}`}>
                    {containerPorts.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePort(index)}
                disabled={ports.length === 1}
              >
                <IconX className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddPort}>
            Add Port
          </Button>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Starting...' : 'Start Port Forward'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
