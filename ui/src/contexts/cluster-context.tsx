import React, { createContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Cluster } from '@/types/api'

interface ClusterContextType {
  clusters: Cluster[]
  currentCluster: string | null
  setCurrentCluster: (clusterName: string) => void
  isLoading: boolean
  error: Error | null
}

export const ClusterContext = createContext<ClusterContextType | undefined>(
  undefined
)

export const ClusterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentCluster, setCurrentClusterState] = useState<string | null>(
    localStorage.getItem('current-cluster')
  )

  // Fetch clusters from API (this request shouldn't need cluster header)
  const {
    data: clusters = [],
    isLoading,
    error,
  } = useQuery<Cluster[]>({
    queryKey: ['clusters'],
    queryFn: async () => {
      // Use direct fetch for clusters endpoint to avoid circular dependency
      const response = await fetch('/api/v1/clusters', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch clusters: ${response.status}`)
      }

      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Set default cluster if none is selected
  useEffect(() => {
    if (clusters.length > 0 && !currentCluster) {
      const defaultCluster = clusters.find((c) => c.isDefault)
      if (defaultCluster) {
        setCurrentClusterState(defaultCluster.name)
        localStorage.setItem('current-cluster', defaultCluster.name)
      } else {
        // If no default cluster, use the first one
        setCurrentClusterState(clusters[0].name)
        localStorage.setItem('current-cluster', clusters[0].name)
      }
    }
    if (
      currentCluster &&
      clusters.length > 0 &&
      !clusters.some((c) => c.name === currentCluster)
    ) {
      // If current cluster is not in the list, reset it
      setCurrentClusterState(null)
      localStorage.removeItem('current-cluster')
    }
  }, [clusters, currentCluster])

  const setCurrentCluster = (clusterName: string) => {
    setCurrentClusterState(clusterName)
    localStorage.setItem('current-cluster', clusterName)
  }

  const value: ClusterContextType = {
    clusters,
    currentCluster,
    setCurrentCluster,
    isLoading,
    error: error as Error | null,
  }

  return (
    <ClusterContext.Provider value={value}>{children}</ClusterContext.Provider>
  )
}
