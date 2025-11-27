import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconExclamationCircle,
  IconLoader,
  IconPlayerPause,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconGhost3,
  IconRotateDot,
  IconCircleDashedPlus,
  IconCircleDashed,
  IconAlertHexagonFilled,
  IconAlertCircleFilled,
  IconCircleDotFilled,
  IconProgressHelp,
} from '@tabler/icons-react'


import { Condition } from 'kubernetes-types/meta/v1'


interface TypesenseClusterStatusIconProps {
  status: string
  className?: string
  showAnimation?: boolean
}

export const TypesenseClusterStatusIcon = ({
  status,
  className = '',
  showAnimation = true,
}: TypesenseClusterStatusIconProps) => {
  const animationClass = showAnimation ? 'animate-spin' : ''

  switch (status) {
    case 'Bootstrapping':
      return (
        <IconCircleDashedPlus
          className={`${animationClass} fill-red-500 dark:fill-red-400 ${className}`}
        />
      )

    case 'QuorumStateUnknown':
      return (
        <IconCircleDashed
          className={`fill-red-500 dark:fill-red-400 ${className}`}
        />
      )

    case 'QuorumReady':
      return (
        <IconCircleCheckFilled
          className={`fill-green-500 dark:fill-green-400 ${className}`}
        />
      )

    case 'QuorumNotReady':
      return (
        <IconAlertCircleFilled
          className={`text-red-500 dark:text-red-400 ${className}`}
        />
      )

    case 'QuorumNotReadyWaitATerm':
      return (
        <IconLoader
          className={`${animationClass} fill-blue-500 dark:fill-blue-400 ${className}`}
        />
      )

    case 'QuorumDowngraded':
      return (
        <IconTrendingDown
          className={`text-gray-500 dark:text-gray-400 ${className}`}
        />
      )

    case 'QuorumUpgraded':
      return (
        <IconTrendingUp
          className={`text-blue-500 dark:text-blue-400 ${className}`}
        />
      )

    case 'QuorumNeedsAttentionMemoryOrDiskIssue':
      return (
        <IconAlertHexagonFilled
          className={`${animationClass} text-red-500 dark:text-red-400 ${className}`}
        />
      )

    case 'QuorumNeedsAttentionClusterIsLagging':
      return (
        <IconAlertHexagonFilled
          className={`text-orange-500 dark:text-orange-400 ${className}`}
        />
      )

    default:
      return (
        <IconAlertHexagonFilled
          className={`fill-red-500 dark:fill-red-400 ${className}`}
        />
      )
  }
}


export const TypesenseClusterReadyIcon = ({ statusData }: { statusData: Condition[] | undefined }) => {
  const conds = statusData ?? []
  // find Ready conditions only
  const readyConds = conds.filter((c) => c?.type === 'Ready')
  if (readyConds.length === 0) {
    return (
      <span>
        <IconProgressHelp className="inline-block fill-gray-400 dark:fill-gray-500" />
      </span>
    )
  }

  if (readyConds.length === 0) {
    return (
      <span>
        <IconProgressHelp className="inline-block fill-gray-400 dark:fill-gray-500" />
      </span>
    )
  }

  // safe parse of date; fallback to epoch 0 for invalid/missing
  const parseTime = (iso?: string) => {
    const t = Date.parse(String(iso))
    return isNaN(t) ? 0 : t
  }

  // pick the newest by lastTransitionTime
  const newest = readyConds.reduce((a: any, b: any) => {
    return parseTime(a.lastTransitionTime) >= parseTime(b.lastTransitionTime) ? a : b
  })

  const status = (newest.status ?? 'Unknown').toString()
  const last = newest.lastTransitionTime
    ? new Date(newest.lastTransitionTime).toLocaleString()
    : 'unknown'

  // decide UI
  if (status === 'True') {
    return (
      <span title={`Ready: True (since ${last})`} aria-label="Ready: True">
        <IconCircleCheckFilled className="inline-block fill-green-500 dark:fill-green-400" />
      </span>
    )
  }

  if (status === 'False') {
    return (
      <span title={`Ready: False (since ${last})`} aria-label="Ready: False">
        <IconCircleDotFilled className="inline-block fill-red-600 dark:fill-red-500" />
      </span>
    )
  }

  return (
    <span title={`Ready: ${status} (since ${last})`} aria-label={`Ready: ${status}`}>
      <IconProgressHelp className="inline-block fill-gray-400 dark:fill-gray-500" />
    </span>
  )
}

export const TypesenseClusterReadyDisplay = ({ statusData }: { statusData: Condition[] | undefined }) => {
  const conds = statusData ?? []
  // find Ready conditions only
  const readyConds = conds.filter((c) => c?.type === 'Ready')
  if (readyConds.length === 0) {
    return "Unknown"
  }

  if (readyConds.length === 0) {
    return "Unknown"
  }

  // safe parse of date; fallback to epoch 0 for invalid/missing
  const parseTime = (iso?: string) => {
    const t = Date.parse(String(iso))
    return isNaN(t) ? 0 : t
  }

  // pick the newest by lastTransitionTime
  const newest = readyConds.reduce((a: any, b: any) => {
    return parseTime(a.lastTransitionTime) >= parseTime(b.lastTransitionTime) ? a : b
  })

  const status = (newest.status ?? 'Unknown').toString()
  if (status === 'True') {
    return "Ready"
  }

  if (status === 'False') {
    return "Not Ready"
  }

  return "Unknown"
}

