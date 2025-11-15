import { useMemo } from 'react'
import { Secret } from 'kubernetes-types/core/v1'

import { useResources } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SecretSelector({
  selectedSecret,
  onSecretChange,
  namespace,
  placeholder = 'Select a secret',
  className,
  avoidHelmSecrets = false,
}: {
  selectedSecret?: string
  onSecretChange: (secret: string) => void
  namespace?: string
  placeholder?: string
  className?: string
  avoidHelmSecrets?: boolean
}) {
  const { data, isLoading } = useResources('secrets', namespace)

  const sortedSecrets = useMemo(() => {
    return data?.slice().sort((a, b) => {
      const nameA = a.metadata?.name?.toLowerCase() || ''
      const nameB = b.metadata?.name?.toLowerCase() || ''
      return nameA.localeCompare(nameB)
    })
  }, [data])

  return (
    <Select value={selectedSecret} onValueChange={onSecretChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isLoading && (
          <SelectItem disabled value="_loading">
            Loading secrets...
          </SelectItem>
        )}
        {sortedSecrets
          ?.filter((secret: Secret) => {
            if (avoidHelmSecrets) {
              return !secret.type?.includes('helm.sh/release.v1')
            }
            return true
          })
          .map((secret: Secret) => (
            <SelectItem
              key={secret.metadata!.name}
              value={secret.metadata!.name!}
            >
              {secret.metadata!.name}
            </SelectItem>
          ))}
        {!isLoading && (!sortedSecrets || sortedSecrets.length === 0) && (
          <SelectItem disabled value="_empty">
            No secrets found
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
