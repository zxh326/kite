import { Deployment } from 'kubernetes-types/apps/v1'
import { Pod } from 'kubernetes-types/core/v1'

import { DeploymentStatusType } from '@/types/k8s'

// This function retrieves the status of a Pod in Kubernetes.
// @see https://github.com/kubernetes/kubernetes/blob/master/pkg/printers/internalversion/printers.go#L881
export function getPodStatus(pod: Pod): string {
  if (!pod.status || !pod.status.phase) {
    return 'Unknown'
  }

  const podPhase = pod.status.phase
  let reason = podPhase

  if (pod.status.reason && pod.status.reason !== '') {
    reason = pod.status.reason
  }

  if (pod.status.conditions) {
    for (const condition of pod.status.conditions) {
      if (
        condition.type === 'PodScheduled' &&
        condition.reason === 'SchedulingGated'
      ) {
        reason = 'SchedulingGated'
      }
    }
  }

  let lastRestartDate = new Date(0)
  let lastRestartableInitContainerRestartDate = new Date(0)

  const initContainers = new Map<
    string,
    { name: string; restartPolicy?: string }
  >()
  if (pod.spec?.initContainers) {
    for (const container of pod.spec.initContainers) {
      initContainers.set(container.name, container)
    }
  }

  let initializing = false

  // Process init container statuses
  if (pod.status.initContainerStatuses) {
    for (let i = 0; i < pod.status.initContainerStatuses.length; i++) {
      const container = pod.status.initContainerStatuses[i]

      if (container.lastState?.terminated?.finishedAt) {
        const terminatedDate = new Date(
          container.lastState.terminated.finishedAt
        )
        if (lastRestartDate < terminatedDate) {
          lastRestartDate = terminatedDate
        }
      }

      const initContainer = initContainers.get(container.name)
      const isRestartableInitContainer =
        initContainer?.restartPolicy === 'Always'

      if (
        isRestartableInitContainer &&
        container.lastState?.terminated?.finishedAt
      ) {
        const terminatedDate = new Date(
          container.lastState.terminated.finishedAt
        )
        if (lastRestartableInitContainerRestartDate < terminatedDate) {
          lastRestartableInitContainerRestartDate = terminatedDate
        }
      }

      if (container.state?.terminated?.exitCode === 0) {
        continue
      } else if (isRestartableInitContainer && container.started) {
        // For restartable init containers that are started, continue processing
        continue
      } else if (container.state?.terminated) {
        // initialization is failed
        if (!container.state.terminated.reason) {
          if (container.state.terminated.signal) {
            reason = `Init:Signal:${container.state.terminated.signal}`
          } else {
            reason = `Init:ExitCode:${container.state.terminated.exitCode}`
          }
        } else {
          reason = 'Init:' + container.state.terminated.reason
        }
        initializing = true
      } else if (
        container.state?.waiting?.reason &&
        container.state.waiting.reason !== 'PodInitializing'
      ) {
        reason = 'Init:' + container.state.waiting.reason
        initializing = true
      } else {
        reason = `Init:${i}/${pod.spec?.initContainers?.length || 0}`
        initializing = true
      }
      break
    }
  }

  // Check if pod is initialized
  const isPodInitialized =
    pod.status.conditions?.some(
      (condition) =>
        condition.type === 'Initialized' && condition.status === 'True'
    ) ?? false

  if (!initializing || isPodInitialized) {
    lastRestartDate = lastRestartableInitContainerRestartDate
    let hasRunning = false

    // Process main container statuses (reverse order)
    if (pod.status.containerStatuses) {
      for (let i = pod.status.containerStatuses.length - 1; i >= 0; i--) {
        const container = pod.status.containerStatuses[i]

        if (container.lastState?.terminated?.finishedAt) {
          const terminatedDate = new Date(
            container.lastState.terminated.finishedAt
          )
          if (lastRestartDate < terminatedDate) {
            lastRestartDate = terminatedDate
          }
        }

        if (container.state?.waiting?.reason) {
          reason = container.state.waiting.reason
        } else if (container.state?.terminated?.reason) {
          reason = container.state.terminated.reason
        } else if (
          container.state?.terminated &&
          !container.state.terminated.reason
        ) {
          if (container.state.terminated.signal) {
            reason = `Signal:${container.state.terminated.signal}`
          } else {
            reason = `ExitCode:${container.state.terminated.exitCode}`
          }
        } else if (container.ready && container.state?.running) {
          hasRunning = true
        }
      }
    }

    // change pod status back to "Running" if there is at least one container still reporting as "Running" status
    if (reason === 'Completed' && hasRunning) {
      const hasPodReadyCondition =
        pod.status.conditions?.some(
          (condition) => condition.type === 'Ready'
        ) ?? false

      if (hasPodReadyCondition) {
        reason = 'Running'
      } else {
        reason = 'NotReady'
      }
    }
  }

  // Handle pod deletion and unreachable states
  if (pod.metadata?.deletionTimestamp) {
    if (pod.status.reason === 'NodeLost') {
      reason = 'Unknown'
    } else if (!isPodPhaseTerminal(podPhase)) {
      reason = 'Terminating'
    }
  }

  return reason
}

// Helper function to check if pod phase is terminal
function isPodPhaseTerminal(phase: string): boolean {
  return phase === 'Failed' || phase === 'Succeeded'
}

export function getPodErrorMessage(pod: Pod): string | undefined {
  if (!pod.status || !pod.status.containerStatuses) {
    return undefined
  }
  if (pod.status.phase === 'Running' || pod.status.phase === 'Succeeded') {
    return ''
  }
  if (pod.status.containerStatuses.length === 0) {
    return ''
  }

  for (const container of pod.status.containerStatuses) {
    if (container.state?.waiting?.reason !== '') {
      return container.state?.waiting?.message || ''
    }
    if (container.state?.terminated?.reason !== '') {
      return container.state?.terminated?.message || ''
    }
    if (container.state?.terminated?.signal) {
      return `Signal: ${container.state.terminated.signal}`
    }
    if (container.state?.terminated?.exitCode !== 0) {
      return `ExitCode: ${container.state.terminated.exitCode}`
    }
  }

  return undefined
}

export function getDeploymentStatus(
  deployment: Deployment
): DeploymentStatusType {
  if (!deployment.status) {
    return 'Unknown'
  }

  const status = deployment.status
  const spec = deployment.spec

  // Check if deployment is being deleted
  if (deployment.metadata?.deletionTimestamp) {
    return 'Terminating'
  }

  // Check if deployment is paused
  if (spec?.paused) {
    return 'Paused'
  }

  // Get replica counts
  const replicas = status.replicas || 0
  if (replicas === 0) {
    return 'Scaled Down'
  }
  const desiredReplicas = spec?.replicas || 0
  const actualReplicas = status.replicas || 0
  const availableReplicas = status.availableReplicas || 0
  const readyReplicas = status.readyReplicas || 0

  if (desiredReplicas !== actualReplicas) {
    return 'Progressing'
  }
  if (availableReplicas != actualReplicas || readyReplicas != actualReplicas) {
    return 'Progressing'
  }

  // All replicas are ready and available
  if (
    readyReplicas === desiredReplicas &&
    availableReplicas === desiredReplicas
  ) {
    return 'Available'
  }

  return 'Unknown'
}
