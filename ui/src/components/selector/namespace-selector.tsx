import { Namespace } from 'kubernetes-types/core/v1'

import { useResources } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function NamespaceSelector({
  selectedNamespace,
  handleNamespaceChange,
  showAll = false,
}: {
  selectedNamespace?: string
  handleNamespaceChange: (namespace: string) => void
  showAll?: boolean
}) {
  const { data, isLoading } = useResources('namespaces')

  const sortedNamespaces = data?.sort((a, b) => {
    const nameA = a.metadata?.name?.toLowerCase() || ''
    const nameB = b.metadata?.name?.toLowerCase() || ''
    return nameA.localeCompare(nameB)
  }) || [{ metadata: { name: 'default' } }]

  return (
    <Select value={selectedNamespace} onValueChange={handleNamespaceChange}>
      <SelectTrigger className="max-w-48">
        <SelectValue placeholder="Select a namespace" />
      </SelectTrigger>
      <SelectContent>
        {isLoading && (
          <SelectItem disabled value="_loading">
            Loading namespaces...
          </SelectItem>
        )}
        {showAll && (
          <SelectItem key="all" value="_all">
            All Namespaces
          </SelectItem>
        )}
        {sortedNamespaces?.map((ns: Namespace) => (
          <SelectItem key={ns.metadata!.name} value={ns.metadata!.name!}>
            {ns.metadata!.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
