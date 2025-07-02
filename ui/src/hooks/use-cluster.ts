import { useContext } from 'react'
import { ClusterContext } from '@/contexts/cluster-context'

export const useCluster = () => {
  const context = useContext(ClusterContext)
  if (context === undefined) {
    throw new Error('useCluster must be used within a ClusterProvider')
  }
  return context
}
