import { useMemo } from 'react'
import { IconLoader } from '@tabler/icons-react'
import { Event } from 'kubernetes-types/core/v1'

import { ResourceType } from '@/types/api'
import { useResourcesEvents } from '@/lib/api'
import { formatDate } from '@/lib/utils'

import { Column, SimpleTable } from './simple-table'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function EventTable(props: {
  resource: ResourceType
  name: string
  namespace?: string
}) {
  const { data: events, isLoading } = useResourcesEvents(
    props.resource,
    props.name,
    props.namespace
  )

  // Event table columns
  const eventColumns = useMemo(
    (): Column<Event>[] => [
      {
        header: 'Type',
        accessor: (event: Event) => event.type || '',
        cell: (value: unknown) => {
          const type = value as string
          const variant = type === 'Normal' ? 'default' : 'destructive'
          return <Badge variant={variant}>{type}</Badge>
        },
      },
      {
        header: 'Reason',
        accessor: (event: Event) => event.reason || '',
        cell: (value: unknown) => (
          <div className="font-medium">{value as string}</div>
        ),
      },
      {
        header: 'Message',
        accessor: (event: Event) => event.message || '',
        cell: (value: unknown) => (
          <div className="text-sm whitespace-pre-wrap">{value as string}</div>
        ),
      },
      {
        header: 'Source',
        accessor: (event: Event) => event.reportingComponent || '',
        cell: (value: unknown) => {
          return (
            <span className="text-muted-foreground text-sm">
              {value as string}
            </span>
          )
        },
      },
      {
        header: 'First Seen',
        accessor: (event: Event) =>
          event.firstTimestamp || event.eventTime || '',
        cell: (value: unknown) => {
          return (
            <span className="text-muted-foreground text-sm">
              {formatDate(value as string)}
            </span>
          )
        },
      },
      {
        header: 'Last Seen',
        accessor: (event: Event) =>
          event.lastTimestamp || event.eventTime || '',
        cell: (value: unknown) => {
          return (
            <span className="text-muted-foreground text-sm">
              {formatDate(value as string)}
            </span>
          )
        },
      },
    ],
    []
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader className="animate-spin mr-2" />
        Loading events...
      </div>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
      </CardHeader>
      <CardContent>
        <SimpleTable
          data={events || []}
          columns={eventColumns}
          emptyMessage="No events found"
        />
      </CardContent>
    </Card>
  )
}
