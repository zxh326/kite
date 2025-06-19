import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconExclamationCircle,
  IconLoader,
  IconPlayerPause,
  IconTrash,
  IconTrendingDown,
} from '@tabler/icons-react'

import { DeploymentStatusType } from '@/types/k8s'

interface DeploymentStatusIconProps {
  status: DeploymentStatusType
  className?: string
  showAnimation?: boolean
}

export const DeploymentStatusIcon = ({
  status,
  className = '',
  showAnimation = true,
}: DeploymentStatusIconProps) => {
  const animationClass = showAnimation ? 'animate-spin' : ''

  switch (status) {
    case 'Available':
      return (
        <IconCircleCheckFilled
          className={`fill-green-500 dark:fill-green-400 ${className}`}
        />
      )

    case 'Unknown':
    case 'Not Available':
      return (
        <IconCircleXFilled
          className={`fill-red-500 dark:fill-red-400 ${className}`}
        />
      )

    case 'Terminating':
      return (
        <IconTrash
          className={`text-orange-500 dark:text-orange-400 ${className}`}
        />
      )

    case 'Paused':
      return (
        <IconPlayerPause
          className={`fill-purple-500 dark:fill-purple-400 ${className}`}
        />
      )

    case 'Scaled Down':
      return (
        <IconTrendingDown
          className={`text-gray-500 dark:text-gray-400 ${className}`}
        />
      )

    case 'Progressing':
      return (
        <IconLoader
          className={`${animationClass} text-blue-500 dark:text-blue-400 ${className}`}
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
