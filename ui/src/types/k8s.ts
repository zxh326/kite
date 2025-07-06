export type DeploymentStatusType =
  | 'Unknown'
  | 'Paused'
  | 'Scaled Down'
  | 'Not Available'
  | 'Progressing'
  | 'Terminating'
  | 'Available'

export type PodStatus = {
  readyContainers: number
  totalContainers: number
  reason: string
  restartString: string
}

export type SimpleContainer = Array<{
  name: string
  image: string
  init?: boolean
}>
