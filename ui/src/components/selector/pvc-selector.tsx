import { useMemo } from 'react'
import { PersistentVolumeClaim } from 'kubernetes-types/core/v1'

import { useResources } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function PVCSelector({
  selectedPVC,
  onPVCChange,
  namespace,
  placeholder = 'Select a pvc',
  className,
}: {
  selectedPVC?: string
  onPVCChange: (pvc: string) => void
  namespace?: string
  placeholder?: string
  className?: string
}) {
  const { data, isLoading } = useResources('persistentvolumeclaims', namespace)

  const sortedPVCs = useMemo(() => {
    return data?.slice().sort((a, b) => {
      const nameA = a.metadata?.name?.toLowerCase() || ''
      const nameB = b.metadata?.name?.toLowerCase() || ''
      return nameA.localeCompare(nameB)
    })
  }, [data])

  return (
    <Select value={selectedPVC} onValueChange={onPVCChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isLoading && (
          <SelectItem disabled value="_loading">
            Loading pvc...
          </SelectItem>
        )}
        {sortedPVCs?.map((pvc: PersistentVolumeClaim) => (
          <SelectItem key={pvc.metadata!.name} value={pvc.metadata!.name!}>
            {pvc.metadata!.name}
          </SelectItem>
        ))}
        {!isLoading && (!sortedPVCs || sortedPVCs.length === 0) && (
          <SelectItem disabled value="_empty">
            No pvc found
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
