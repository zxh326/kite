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

  const metricRequest =
    type === 'cpu' ? pod?.metrics?.cpuRequest : pod?.metrics?.memoryRequest

  const formatValue = useCallback(
    (val?: number) =>
      val ? (type === 'cpu' ? `${val}m` : formatMemory(val)) : '-',
    [type]
  )

  return useMemo(() => {
    if (metricValue === 0) {
      return <span className="text-muted-foreground">-</span>
    }

    const percentage = metricLimit
      ? Math.min((metricValue / metricLimit) * 100, 100)
      : 0

    const requestPercentage =
      metricRequest && metricLimit
        ? Math.min((metricRequest / metricLimit) * 100, 100)
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
            <div className="w-14 h-2 relative">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {metricRequest && metricLimit && (
                <div
                  className="absolute -top-0.5 h-3 flex items-center justify-center"
                  style={{
                    left: `${requestPercentage}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="w-0.5 h-3 bg-muted-foreground dark:bg-gray-400 rounded-sm shadow-sm"></div>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm grid grid-cols-2 gap-x-3 gap-y-0.5 min-w-0">
              <span>Usage:</span>
              <span className="text-right">{formatValue(metricValue)}</span>
              <span>Request:</span>
              <span className="text-right">{formatValue(metricRequest)}</span>
              <span>Limit:</span>
              <span className="text-right">{formatValue(metricLimit)}</span>
            </div>
          </TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground min-w-fit">
          {formatValue(metricValue)}
        </span>
      </div>
    )
  }, [metricValue, metricLimit, metricRequest, formatValue])
}
