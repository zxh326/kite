import { useMemo, useState } from 'react'
import { IconExternalLink, IconLoader } from '@tabler/icons-react'

import { RelatedResources, ResourceType } from '@/types/api'
import { useRelatedResources } from '@/lib/api'
import { getCRDResourcePath, isStandardK8sResource } from '@/lib/k8s'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { Column, SimpleTable } from './simple-table'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function RelatedResourcesTable(props: {
  resource: ResourceType
  name: string
  namespace?: string
}) {
  const { resource, name, namespace } = props

  const { data: relatedResources, isLoading } = useRelatedResources(
    resource,
    name,
    namespace
  )

  const relatedColumns = useMemo(
    (): Column<RelatedResources>[] => [
      {
        header: 'Kind',
        accessor: (rs: RelatedResources) => rs.type,
        cell: (value: unknown) => (
          <Badge className="capitalize">{value as string}</Badge>
        ),
      },
      {
        header: 'Name',
        accessor: (rs: RelatedResources) => rs,
        cell: (value: unknown) => {
          const rs = value as RelatedResources
          return <RelatedResourceCell rs={rs} />
        },
      },
    ],
    []
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader className="animate-spin mr-2" />
        Loading related...
      </div>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Related</CardTitle>
      </CardHeader>
      <CardContent>
        <SimpleTable
          data={relatedResources || []}
          columns={relatedColumns}
          emptyMessage="No related found"
        />
      </CardContent>
    </Card>
  )
}

function RelatedResourceCell({ rs }: { rs: RelatedResources }) {
  const [open, setOpen] = useState(false)

  const path = useMemo(() => {
    if (isStandardK8sResource(rs.type)) {
      return `/${rs.type}/${rs.namespace ? `${rs.namespace}/` : ''}${rs.name}`
    }
    return getCRDResourcePath(rs.type, rs.apiVersion!, rs.namespace, rs.name)
  }, [rs])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="font-medium text-blue-500 hover:underline cursor-pointer">
          {rs.name}
        </div>
      </DialogTrigger>
      <DialogContent className="!max-w-[60%] !h-[80%] flex flex-col">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="capitalize">{rs.type}</DialogTitle>
          <a href={path} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="icon">
              <IconExternalLink size={12} />
            </Button>
          </a>
        </DialogHeader>
        <iframe
          src={`${path}?iframe=true`}
          className="w-full flex-grow border-none"
        />
      </DialogContent>
    </Dialog>
  )
}
