import { useEffect, useMemo, useState } from 'react'
import {
  IconExternalLink,
  IconLoader,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react'
import * as yaml from 'js-yaml'
import { Pod } from 'kubernetes-types/core/v1'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { updateResource, useResource } from '@/lib/api'
import { getOwnerInfo, getPodErrorMessage, getPodStatus } from '@/lib/k8s'
import { withSubPath } from '@/lib/subpath'
import { formatDate, translateError } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { ContainerTable } from '@/components/container-table'
import { DescribeDialog } from '@/components/describe-dialog'
import { ErrorMessage } from '@/components/error-message'
import { EventTable } from '@/components/event-table'
import { LabelsAnno } from '@/components/lables-anno'
import { LogViewer } from '@/components/log-viewer'
import { PodMonitoring } from '@/components/pod-monitoring'
import { PodStatusIcon } from '@/components/pod-status-icon'
import { RelatedResourcesTable } from '@/components/related-resource-table'
import { ResourceDeleteConfirmationDialog } from '@/components/resource-delete-confirmation-dialog'
import { Terminal } from '@/components/terminal'
import { VolumeTable } from '@/components/volume-table'
import { YamlEditor } from '@/components/yaml-editor'

export function PodDetail(props: { namespace: string; name: string }) {
  const { namespace, name } = props
  const [yamlContent, setYamlContent] = useState('')
  const [isSavingYaml, setIsSavingYaml] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const { t } = useTranslation()

  const {
    data: pod,
    isLoading,
    isError,
    error: podError,
    refetch: handleRefresh,
  } = useResource('pods', name, namespace)

  useEffect(() => {
    if (pod) {
      setYamlContent(yaml.dump(pod, { indent: 2 }))
    }
  }, [pod])

  const handleSaveYaml = async (content: Pod) => {
    setIsSavingYaml(true)
    try {
      await updateResource('pods', name, namespace, content)
      toast.success('YAML saved successfully')
      // Refresh data after successful save
      await handleRefresh()
    } catch (error) {
      toast.error(translateError(error, t))
    } finally {
      setIsSavingYaml(false)
    }
  }

  const handleYamlChange = (content: string) => {
    setYamlContent(content)
  }

  const handleManualRefresh = async () => {
    // Increment refresh key to force YamlEditor re-render
    setRefreshKey((prev) => prev + 1)
    await handleRefresh()
  }

  const podStatus = useMemo(() => {
    return getPodStatus(pod)
  }, [pod])

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <IconLoader className="animate-spin" />
              <span>Loading pod details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError || !pod) {
    return (
      <ErrorMessage
        resourceName={'Pod'}
        error={podError}
        refetch={handleRefresh}
      />
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{name}</h1>
          <p className="text-muted-foreground">
            Namespace: <span className="font-medium">{namespace}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            <IconRefresh className="w-4 h-4" />
            Refresh
          </Button>
          <DescribeDialog
            resourceType="pods"
            namespace={namespace}
            name={name}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <IconTrash className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      <ResponsiveTabs
        tabs={[
          {
            value: 'overview',
            label: 'Overview',
            content: (
              <div className="space-y-4">
                {/* Status Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <PodStatusIcon
                            status={podStatus?.reason}
                            className="w-4 h-4"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phase</p>
                          <p className="text-sm font-medium">
                            {podStatus.reason}
                          </p>
                          <p className="text-xs text-red-500">
                            {getPodErrorMessage(pod)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ready Containers
                        </p>
                        <p className="text-sm font-medium">
                          {podStatus.readyContainers} /{' '}
                          {podStatus.totalContainers}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Restart Count
                        </p>
                        <p className="text-sm font-medium">
                          {podStatus.restartString}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Node</p>
                        <p className="text-sm font-medium truncate">
                          {pod.spec?.nodeName ? (
                            <Link
                              to={`/nodes/${pod.spec.nodeName}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {pod.spec.nodeName}
                            </Link>
                          ) : (
                            'Not assigned'
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Pod Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pod Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Created
                        </Label>
                        <p className="text-sm">
                          {formatDate(
                            pod.metadata?.creationTimestamp || '',
                            true
                          )}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Started
                        </Label>
                        <p className="text-sm">
                          {pod.status?.startTime
                            ? formatDate(pod.status.startTime)
                            : 'Not started'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Pod IP
                        </Label>
                        <p className="text-sm font-mono">
                          {pod.status?.podIP || 'Not assigned'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Host IP
                        </Label>
                        <p className="text-sm font-mono">
                          {pod.status?.hostIP || 'Not assigned'}
                        </p>
                      </div>
                      {getOwnerInfo(pod.metadata) && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Owner
                          </Label>
                          <p className="text-sm">
                            {(() => {
                              const ownerInfo = getOwnerInfo(pod.metadata)
                              if (!ownerInfo) {
                                return 'No owner'
                              }
                              return (
                                <Link
                                  to={ownerInfo.path}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {ownerInfo.kind}/{ownerInfo.name}
                                </Link>
                              )
                            })()}
                          </p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Ports
                        </Label>
                        <div className="flex flex-wrap items-center gap-1">
                          {pod.spec?.containers
                            .flatMap((c) => c.ports || [])
                            .map((port, index, array) => (
                              <span
                                key={`${port.containerPort}-${port.protocol}`}
                              >
                                <a
                                  href={withSubPath(
                                    `/api/v1/namespaces/${namespace}/pods/${name}:${port.containerPort}/proxy/`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                                >
                                  {port.name && `${port.name}:`}
                                  {port.containerPort}
                                  <IconExternalLink className="w-3 h-3" />
                                </a>
                                {index < array.length - 1 && ', '}
                              </span>
                            ))}
                          {(!pod.spec?.containers ||
                            pod.spec.containers.length === 0 ||
                            pod.spec.containers.every(
                              (c) => !c.ports || c.ports.length === 0
                            )) && <span>No ports defined</span>}
                        </div>
                      </div>
                    </div>
                    <LabelsAnno
                      labels={pod.metadata?.labels || {}}
                      annotations={pod.metadata?.annotations || {}}
                    />
                  </CardContent>
                </Card>

                {pod.spec?.initContainers &&
                  pod.spec.initContainers.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Init Containers (
                          {pod?.spec?.initContainers?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="space-y-4">
                            {pod?.spec?.initContainers?.map((container) => (
                              <ContainerTable
                                key={container.name}
                                container={container}
                                init
                              />
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Containers ({pod?.spec?.containers?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {pod?.spec?.containers?.map((container) => (
                          <ContainerTable
                            key={container.name}
                            container={container}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pod Conditions */}
                {pod.status?.conditions && pod.status.conditions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Conditions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {pod.status.conditions.map((condition, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 border rounded"
                          >
                            <Badge
                              variant={
                                condition.status === 'True'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {condition.type}
                            </Badge>
                            <span className="text-sm">{condition.message}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDate(condition.lastTransitionTime || '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ),
          },
          {
            value: 'yaml',
            label: 'YAML',
            content: (
              <div className="space-y-4">
                <YamlEditor<'pods'>
                  key={refreshKey}
                  value={yamlContent}
                  title="YAML Configuration"
                  onSave={handleSaveYaml}
                  onChange={handleYamlChange}
                  isSaving={isSavingYaml}
                />
              </div>
            ),
          },
          {
            value: 'logs',
            label: 'Logs',
            content: (
              <LogViewer
                namespace={namespace}
                podName={name}
                containers={pod.spec?.containers}
                initContainers={pod.spec?.initContainers}
              />
            ),
          },
          {
            value: 'terminal',
            label: 'Terminal',
            content: (
              <div className="space-y-6">
                <Terminal
                  namespace={namespace}
                  podName={name}
                  containers={pod.spec?.containers}
                  initContainers={pod.spec?.initContainers}
                />
              </div>
            ),
          },
          {
            value: 'volumes',
            label: (
              <>
                Volumes
                {pod.spec?.volumes && (
                  <Badge variant="secondary">{pod.spec.volumes.length}</Badge>
                )}
              </>
            ),
            content: (
              <div className="space-y-6">
                <VolumeTable
                  namespace={namespace}
                  volumes={pod.spec?.volumes}
                  containers={pod.spec?.containers}
                  isLoading={isLoading}
                />
              </div>
            ),
          },
          {
            value: 'Related',
            label: 'Related',
            content: (
              <RelatedResourcesTable
                resource={'pods'}
                name={name}
                namespace={namespace}
              />
            ),
          },
          {
            value: 'events',
            label: 'Events',
            content: (
              <EventTable resource="pods" name={name} namespace={namespace} />
            ),
          },
          {
            value: 'monitor',
            label: 'Monitor',
            content: (
              <div className="space-y-6">
                <PodMonitoring
                  namespace={namespace}
                  podName={name}
                  containers={pod.spec?.containers}
                  initContainers={pod.spec?.initContainers}
                />
              </div>
            ),
          },
        ]}
      />

      <ResourceDeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        resourceName={name}
        resourceType="pods"
        namespace={namespace}
      />
    </div>
  )
}
