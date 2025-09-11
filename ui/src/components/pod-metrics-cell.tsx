import { PodWithMetrics } from '@/types/api'
import { formatMemory } from '@/lib/utils'

export function PodMetricCell({
  pod,
  type,
  value,
}: {
  pod?: PodWithMetrics
  type: 'cpu' | 'memory'
  value?: number
}) {
  if (type === 'cpu') {
    const cpuValue = pod?.metrics?.cpuUsage || value || 0
    if (cpuValue === 0) {
      return <span className="text-muted-foreground">-</span>
    }
    return <span className="text-sm text-muted-foreground">{cpuValue}m</span>
  } else {
    const memoryValue = pod?.metrics?.memoryUsage || value || 0
    return (
      <span className="text-muted-foreground text-sm">
        {formatMemory(memoryValue)}
      </span>
    )
  }
}
