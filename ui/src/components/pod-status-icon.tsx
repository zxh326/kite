import {
  IconAlertTriangle,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconExclamationCircle,
  IconLoader,
  IconTrash,
} from '@tabler/icons-react'

export type StatusType =
  | 'success'
  | 'warning'
  | 'error'
  | 'pending'
  | 'loading'
  | 'terminating'
  | 'default'

interface StatusIconProps {
  status: string
  className?: string
  showAnimation?: boolean
}

export const PodStatusIcon = ({
  status,
  className = '',
  showAnimation = true,
}: StatusIconProps) => {
  const getStatusType = (status: string): StatusType => {
    // Success states
    if (status === 'Running') {
      return 'success'
    }

    // Completed/Success states
    if (status === 'Succeeded' || status === 'Completed') {
      return 'success'
    }

    // Failed/Error states
    if (
      status === 'Failed' ||
      status.startsWith('Init:ExitCode:') ||
      status.startsWith('Init:Signal:') ||
      status.startsWith('ExitCode:') ||
      status.startsWith('Signal:') ||
      status.includes('Error') ||
      status.includes('CrashLoopBackOff') ||
      status.includes('ImagePullBackOff') ||
      status.includes('ErrImagePull')
    ) {
      return 'error'
    }

    // Terminating states
    if (status === 'Terminating') {
      return 'terminating'
    }

    // Warning states
    if (
      status === 'Unknown' ||
      status === 'NotReady' ||
      status.includes('ImageInspectError') ||
      status.includes('RegistryUnavailable')
    ) {
      return 'warning'
    }

    // Pending/Waiting states
    if (
      status === 'Pending' ||
      status === 'ContainerCreating' ||
      status === 'PodInitializing' ||
      status === 'SchedulingGated' ||
      status.startsWith('Init:') ||
      status.includes('Pending') ||
      status.includes('Creating') ||
      (status.includes('ImagePullBackOff') === false && status.includes('Pull'))
    ) {
      return 'pending'
    }

    // Loading states for ongoing processes
    if (
      status.includes('Pulling') ||
      status.includes('Starting') ||
      status.includes('Stopping')
    ) {
      return 'loading'
    }

    // Default for any unmatched status
    return 'default'
  }

  const renderIcon = () => {
    const statusType = getStatusType(status)
    const animationClass = showAnimation ? 'animate-spin' : ''

    switch (statusType) {
      case 'success':
        if (status === 'Running') {
          return (
            <IconCircleCheckFilled
              className={`fill-green-500 dark:fill-green-400 ${className}`}
            />
          )
        }
        // Completed/Succeeded states
        return (
          <IconCircleCheckFilled
            className={`fill-blue-500 dark:fill-blue-400 ${className}`}
          />
        )

      case 'error':
        return (
          <IconCircleXFilled
            className={`fill-red-500 dark:fill-red-400 ${className}`}
          />
        )

      case 'terminating':
        return (
          <IconTrash
            className={`text-orange-500 dark:text-orange-400 ${className}`}
          />
        )

      case 'warning':
        return (
          <IconAlertTriangle
            className={`fill-yellow-500 dark:fill-yellow-400 ${className}`}
          />
        )

      case 'pending':
        return (
          <IconLoader
            className={`text-blue-500 dark:text-blue-400 ${className}`}
          />
        )

      case 'loading':
        return (
          <IconLoader
            className={`${animationClass} text-gray-500 dark:text-gray-400 ${className}`}
          />
        )

      case 'default':
      default:
        return (
          <IconExclamationCircle
            className={`fill-gray-500 dark:fill-gray-400 ${className}`}
          />
        )
    }
  }

  return renderIcon()
}
