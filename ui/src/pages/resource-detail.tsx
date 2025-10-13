import { useParams } from 'react-router-dom'

import { ResourceType } from '@/types/api'
import { usePageTitle } from '@/hooks/use-page-title'
import { Card, CardContent } from '@/components/ui/card'

import { CronJobDetail } from './cronjob-detail'
import { DaemonSetDetail } from './daemonset-detail'
import { DeploymentDetail } from './deployment-detail'
import { JobDetail } from './job-detail'
import { NodeDetail } from './node-detail'
import { PodDetail } from './pod-detail'
import { SecretDetail } from './secret-detail'
import { ServiceDetail } from './service-detail'
import { SimpleResourceDetail } from './simple-resource-detail'
import { StatefulSetDetail } from './statefulset-detail'

function getResourceTypeName(resource: string): string {
  const resourceMap: Record<string, string> = {
    deployments: 'Deploy',
    daemonsets: 'Daemon',
    statefulsets: 'STS',
    jobs: 'Job',
    persistentvolumeclaims: 'PVC',
    persistentvolumes: 'PV',
    horizontalpodautoscalers: 'HPA',
  }
  return (
    resourceMap[resource] ||
    resource.replace(/s$/, '').charAt(0).toUpperCase() + resource.slice(1, -1)
  )
}

export function ResourceDetail() {
  const { resource, namespace, name } = useParams()

  const resourceTypeName = resource ? getResourceTypeName(resource) : ''
  const pageTitle =
    resource && name ? `${name} (${resourceTypeName})` : 'Resource'
  usePageTitle(pageTitle)

  if (!resource || !name) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Invalid parameters. name are required.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  switch (resource) {
    case 'deployments':
      return <DeploymentDetail namespace={namespace!} name={name} />
    case 'pods':
      return <PodDetail namespace={namespace!} name={name} />
    case 'daemonsets':
      return <DaemonSetDetail namespace={namespace!} name={name} />
    case 'statefulsets':
      return <StatefulSetDetail namespace={namespace!} name={name} />
    case 'jobs':
      return <JobDetail namespace={namespace!} name={name} />
    case 'cronjobs':
      return <CronJobDetail namespace={namespace!} name={name} />
    case 'secrets':
      return <SecretDetail namespace={namespace!} name={name} />
    case 'nodes':
      return <NodeDetail name={name} />
    case 'services':
      return <ServiceDetail namespace={namespace!} name={name} />
    default:
      return (
        <SimpleResourceDetail
          resourceType={resource as ResourceType}
          namespace={namespace}
          name={name}
        />
      )
  }
}
