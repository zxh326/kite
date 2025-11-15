import { useParams } from 'react-router-dom'

import { ResourceType } from '@/types/api'
import { usePageTitle } from '@/hooks/use-page-title'

import { ConfigMapListPage } from './configmap-list-page'
import { CRDListPage } from './crd-list-page'
import { CronJobListPage } from './cronjob-list-page'
import { DaemonSetListPage } from './daemonset-list-page'
import { DeploymentListPage } from './deployment-list-page'
import { EventListPage } from './event-list-page'
import { GatewayListPage } from './gateway-list-page'
import { HorizontalPodAutoscalerListPage } from './horizontalpodautoscaler-list-page'
import { HTTPRouteListPage } from './httproute-list-page'
import { IngressListPage } from './ingress-list-page'
import { JobListPage } from './job-list-page'
import { NamespaceListPage } from './namespace-list-page'
import { NodeListPage } from './node-list-page'
import { PodListPage } from './pod-list-page'
import { PVCListPage } from './pvc-list-page'
import { SecretListPage } from './secret-list-page'
import { ServiceListPage } from './service-list-page'
import { SimpleListPage } from './simple-list-page'
import { StatefulSetListPage } from './statefulset-list-page'

export function ResourceList() {
  const { resource } = useParams()

  usePageTitle(
    resource
      ? resource.charAt(0).toUpperCase() + resource.slice(1)
      : 'Resources'
  )

  switch (resource) {
    case 'pods':
      return <PodListPage />
    case 'namespaces':
      return <NamespaceListPage />
    case 'nodes':
      return <NodeListPage />
    case 'ingresses':
      return <IngressListPage />
    case 'deployments':
      return <DeploymentListPage />
    case 'services':
      return <ServiceListPage />
    case 'jobs':
      return <JobListPage />
    case 'cronjobs':
      return <CronJobListPage />
    case 'statefulsets':
      return <StatefulSetListPage />
    case 'daemonsets':
      return <DaemonSetListPage />
    case 'configmaps':
      return <ConfigMapListPage />
    case 'secrets':
      return <SecretListPage />
    case 'persistentvolumeclaims':
      return <PVCListPage />
    case 'crds':
      return <CRDListPage />
    case 'gateways':
      return <GatewayListPage />
    case 'httproutes':
      return <HTTPRouteListPage />
    case 'horizontalpodautoscalers':
      return <HorizontalPodAutoscalerListPage />
    case 'events':
      return <EventListPage />
    default:
      return <SimpleListPage resourceType={resource as ResourceType} />
  }
}
