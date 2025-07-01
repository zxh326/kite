import { useState } from 'react'
import { IconCheck, IconChevronDown, IconServer } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { useCluster } from '@/hooks/use-cluster'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ClusterSelector() {
  const { clusters, currentCluster, setCurrentCluster, isLoading } =
    useCluster()
  const queryClient = useQueryClient()
  const [isSwitching, setIsSwitching] = useState(false)

  const handleClusterChange = async (clusterName: string) => {
    if (clusterName !== currentCluster && !isSwitching) {
      try {
        setIsSwitching(true)
        setCurrentCluster(clusterName)
        setTimeout(() => {
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey[0] as string
              return !['user', 'auth', 'clusters'].includes(key)
            },
          })
          setIsSwitching(false)
          toast.success(`Switched to cluster: ${clusterName}`, {
            id: 'cluster-switch',
          })
        }, 300)
      } catch (error) {
        console.error('Failed to switch cluster:', error)
        setIsSwitching(false)
        toast.error('Failed to switch cluster', {
          id: 'cluster-switch',
        })
      }
    }
  }

  if (isLoading || isSwitching) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        {isSwitching && (
          <span className="ml-2 text-sm text-muted-foreground">
            Switching cluster...
          </span>
        )}
      </div>
    )
  }

  if (clusters.length <= 1) {
    return null
  }

  const currentClusterData = clusters.find((c) => c.name === currentCluster)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-8 px-3 max-w-full focus-visible:ring-0 focus-visible:border-transparent"
          disabled={isSwitching}
        >
          <IconServer className="h-4 w-4" />
          <span className="text-sm font-medium truncate">
            {isSwitching
              ? 'Switching...'
              : currentClusterData?.name || 'Select Cluster'}
          </span>
          <IconChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]">
        {clusters.map((cluster) => (
          <DropdownMenuItem
            key={cluster.name}
            onClick={() => handleClusterChange(cluster.name)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium">{cluster.name}</span>
                {cluster.isDefault && (
                  <Badge className="text-xs">Default</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {cluster.version}
              </span>
            </div>
            {currentCluster === cluster.name && (
              <IconCheck className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
