import {
  IconAlertTriangle,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconExclamationCircle,
  IconPlayerPause,
} from '@tabler/icons-react'

export type NodeStatusType =
  | 'Ready'
  | 'NotReady'
  | 'Ready,SchedulingDisabled'
  | 'NotReady,SchedulingDisabled'
  | 'NetworkUnavailable'
  | 'MemoryPressure'
  | 'DiskPressure'
  | 'PIDPressure'
  | 'Unknown'

interface NodeStatusIconProps {
  status: NodeStatusType | string
  className?: string
}

export const NodeStatusIcon = ({
  status,
  className = '',
}: NodeStatusIconProps) => {
  switch (status) {
    case 'Ready':
      return (
        <IconCircleCheckFilled
          className={`fill-green-500 dark:fill-green-400 ${className}`}
        />
      )

    case 'Ready,SchedulingDisabled':
      return (
        <IconPlayerPause
          className={`fill-yellow-500 dark:fill-yellow-400 ${className}`}
        />
      )

    case 'NotReady':
    case 'NotReady,SchedulingDisabled':
    case 'NetworkUnavailable':
      return (
        <IconCircleXFilled
          className={`fill-red-500 dark:fill-red-400 ${className}`}
        />
      )

    case 'MemoryPressure':
    case 'DiskPressure':
    case 'PIDPressure':
      return (
        <IconAlertTriangle
          className={`fill-yellow-500 dark:fill-yellow-400 ${className}`}
        />
      )

    default:
      return (
        <IconExclamationCircle
          className={`fill-gray-500 dark:fill-gray-400 ${className}`}
        />
      )
  }
}
