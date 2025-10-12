import { useEffect, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { apiClient } from '@/lib/api-client'
import { translateError } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

interface PortForwardSession {
  id: string
  namespace: string
  podName: string
  ports: string[]
}

export function PortForwardManager() {
  const { t } = useTranslation()
  const [sessions, setSessions] = useState<PortForwardSession[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const fetchSessions = async () => {
    try {
      const response = await apiClient.get<PortForwardSession[]>(
        '/portforwards'
      )
      setSessions(response)
    } catch (error) {
      toast.error(translateError(error, t))
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen])

  const handleStop = async (id: string) => {
    try {
      await apiClient.delete(`/portforwards/${id}`)
      toast.success('Port forwarding session stopped')
      fetchSessions()
    } catch (error) {
      toast.error(translateError(error, t))
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">Active Port Forwards</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Active Port Forwards</SheetTitle>
          <SheetDescription>
            Manage your active port forwarding sessions.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          {sessions.length === 0 ? (
            <p className="text-muted-foreground">
              No active port forwarding sessions.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-semibold">
                    {session.podName}
                    <span className="text-xs text-muted-foreground ml-2">
                      {session.namespace}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session.ports.join(', ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStop(session.id)}
                >
                  <IconX className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
