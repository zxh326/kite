import { useCallback, useMemo } from 'react'

import { PodWithMetrics } from '@/types/api'
import { formatMemory } from '@/lib/utils'

import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export function PodMetricCell({
  pod,
  type,
}: {
  pod?: PodWithMetrics
  type: 'cpu' | 'memory'
}) {
  const metricValue =
    type === 'cpu'
      ? pod?.metrics?.cpuUsage || 0
      : pod?.metrics?.memoryUsage || 0

  const metricLimit =
    type === 'cpu' ? pod?.metrics?.cpuLimit : pod?.metrics?.memoryLimit

  const formatValue = useCallback(
    (val: number) => (type === 'cpu' ? `${val}m` : formatMemory(val)),
    [type]
  )

  const formatLimit = useCallback(
    (limit: number | undefined) => (limit ? formatValue(limit) : '-'),
    [formatValue]
  )

  return useMemo(() => {
    if (metricValue === 0) {
      return <span className="text-muted-foreground">-</span>
    }

    const percentage = metricLimit
      ? Math.min((metricValue / metricLimit) * 100, 100)
      : 0

    const getProgressColor = () => {
      if (percentage > 90) return 'bg-red-500'
      if (percentage > 60) return 'bg-yellow-500'
      return 'bg-blue-500'
    }

    return (
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-14 bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{
                  width: `${percentage}%`,
                }}
              ></div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <span>
              {formatValue(metricValue)} / {formatLimit(metricLimit)}
            </span>
          </TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground min-w-fit">
          {formatValue(metricValue)}
        </span>
      </div>
    )
  }, [metricValue, metricLimit, formatValue, formatLimit])
}
