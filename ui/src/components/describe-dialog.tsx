import { useState } from 'react'

import { ResourceType } from '@/types/api'
import { useDescribe } from '@/lib/api'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

import { TextViewer } from './text-viewer'
import { Button } from './ui/button'

export function DescribeDialog({
  resourceType,
  namespace,
  name,
}: {
  resourceType: ResourceType
  namespace?: string
  name: string
}) {
  const [isDescribeOpen, setIsDescribeOpen] = useState(false)
  const { data: describeText } = useDescribe(resourceType, name, namespace, {
    enabled: isDescribeOpen,
    staleTime: 0,
  })

  return (
    <Dialog open={isDescribeOpen} onOpenChange={setIsDescribeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Describe
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-dvw">
        <TextViewer
          title={`kubectl describe pods -n ${namespace} ${name}`}
          value={describeText?.result || ''}
        />
      </DialogContent>
    </Dialog>
  )
}
