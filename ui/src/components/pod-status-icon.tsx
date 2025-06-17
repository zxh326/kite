import {
  IconCircleCheckFilled,
  IconExclamationCircle,
  IconLoader,
} from '@tabler/icons-react'
import { Pod } from 'kubernetes-types/core/v1'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { Badge } from './ui/badge'

const statusIcons = {
  Running: (
    <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
  ),
  Pending: <IconLoader className="fill-amber-500 dark:fill-amber-400" />,
  Succeeded: (
    <IconCircleCheckFilled className="fill-blue-500 dark:fill-blue-400" />
  ),
  Failed: <IconExclamationCircle className="fill-red-500 dark:fill-red-400" />,
  Unknown: (
    <IconExclamationCircle className="fill-gray-500 dark:fill-gray-400" />
  ),
}

interface PodStatusIconProps {
  pod: Pod
  className?: string
}

export const PodStatusIcon = ({ pod }: PodStatusIconProps) => {
  type PodPhase = keyof typeof statusIcons
  const status = (pod.status?.phase || 'Unknown') as PodPhase
  // Get tooltip content
  const getTooltipContent = () => {
    return status
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {statusIcons[status]}
          {status}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{getTooltipContent()}</TooltipContent>
    </Tooltip>
  )
}
