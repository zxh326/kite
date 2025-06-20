import { useEffect, useState } from 'react'
import {
  IconCircleCheckFilled,
  IconExclamationCircle,
  IconLoader,
  IconRefresh,
  IconReload,
  IconTrash,
} from '@tabler/icons-react'
import * as yaml from 'js-yaml'
import { DaemonSet } from 'kubernetes-types/apps/v1'
import { Container } from 'kubernetes-types/core/v1'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  deleteResource,
  updateResource,
  useResource,
  useResources,
} from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { ContainerTable } from '@/components/container-table'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { EventTable } from '@/components/event-table'
import { LabelsAnno } from '@/components/lables-anno'
import { LogViewer } from '@/components/log-viewer'
import { PodMonitoring } from '@/components/pod-monitoring'
import { PodTable } from '@/components/pod-table'
import { Terminal } from '@/components/terminal'
import { VolumeTable } from '@/components/volume-table'
import { YamlEditor } from '@/components/yaml-editor'

export function DaemonSetDetail(props: { namespace: string; name: string }) {
  const { namespace, name } = props
  const [yamlContent, setYamlContent] = useState('')
  const [isSavingYaml, setIsSavingYaml] = useState(false)
  const [isRestartPopoverOpen, setIsRestartPopoverOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<number>(0)
  const navigate = useNavigate()

  // Fetch daemonset data
  const {
    data: daemonset,
    isLoading: isLoadingDaemonSet,
    isError: isDaemonSetError,
    error: daemonsetError,
    refetch: refetchDaemonSet,
  } = useResource('daemonsets', name, namespace, {
    refreshInterval,
  })

  useEffect(() => {
    if (daemonset) {
      setYamlContent(yaml.dump(daemonset, { indent: 2 }))
    }
  }, [daemonset])

  // Auto-reset refresh interval when daemonset reaches stable state
  useEffect(() => {
    if (daemonset && refreshInterval > 0) {
      const { status } = daemonset
      const readyReplicas = status?.numberReady || 0
      const desiredReplicas = status?.desiredNumberScheduled || 0
      const currentReplicas = status?.currentNumberScheduled || 0

      // Check if daemonset is in a stable state
      const isStable =
        readyReplicas === desiredReplicas && currentReplicas === desiredReplicas

      if (isStable) {
        setRefreshInterval(0)
      }
    }
  }, [daemonset, refreshInterval])

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
    refetchDaemonSet()
  }

  const labelSelector = daemonset?.spec?.selector.matchLabels
    ? Object.entries(daemonset.spec.selector.matchLabels)
        .map(([key, value]) => `${key}=${value}`)
        .join(',')
    : undefined

  const { data: relatedPods, isLoading: isLoadingPods } = useResources(
    'pods',
    namespace,
    {
      labelSelector,
      refreshInterval,
      disable: !daemonset?.spec?.selector.matchLabels,
    }
  )

  const handleSaveYaml = async () => {
    setIsSavingYaml(true)
    try {
      const parsedYaml = yaml.load(yamlContent) as DaemonSet
      await updateResource('daemonsets', name, namespace, parsedYaml)
      toast.success('DaemonSet YAML saved successfully')
      setRefreshInterval(1000) // Set a short refresh interval to see changes
      await refetchDaemonSet()
    } catch (error) {
      console.error('Failed to save YAML:', error)
      toast.error(
        `Failed to save YAML: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    } finally {
      setIsSavingYaml(false)
    }
  }

  const handleYamlChange = (content: string) => {
    setYamlContent(content)
  }

  const handleRestart = async () => {
    if (!daemonset) return

    try {
      // Create a deep copy of the daemonset to avoid modifying the original
      const updatedDaemonSet = {
        ...daemonset,
      }

      // Ensure annotations object exists
      if (!updatedDaemonSet.spec!.template!.metadata!.annotations) {
        updatedDaemonSet.spec!.template!.metadata!.annotations = {}
      }

      // Add restart annotation to trigger pod restart
      updatedDaemonSet.spec!.template!.metadata!.annotations[
        'kite.kubernetes.io/restartedAt'
      ] = new Date().toISOString()

      await updateResource('daemonsets', name, namespace, updatedDaemonSet)
      toast.success('DaemonSet restart initiated')
      setIsRestartPopoverOpen(false)
      setRefreshInterval(1000)
    } catch (error) {
      console.error('Failed to restart daemonset:', error)
      toast.error(
        `Failed to restart daemonset: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteResource('daemonsets', name, namespace)
      toast.success('DaemonSet deleted successfully')
      navigate(`/daemonsets`)
    } catch (error) {
      toast.error(
        `Failed to delete DaemonSet: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleContainerUpdate = async (updatedContainer: Container) => {
    try {
      // Create a deep copy of the daemonset to avoid modifying the original
      const updatedDaemonSet = JSON.parse(
        JSON.stringify(daemonset)
      ) as DaemonSet

      // Update the specific container in the daemonset spec
      if (updatedDaemonSet.spec?.template?.spec?.containers) {
        const containerIndex =
          updatedDaemonSet.spec.template.spec.containers.findIndex(
            (c) => c.name === updatedContainer.name
          )
        if (containerIndex !== -1) {
          updatedDaemonSet.spec.template.spec.containers[containerIndex] =
            updatedContainer
          await updateResource('daemonsets', name, namespace, updatedDaemonSet)
          toast.success('Container updated successfully')
          setRefreshInterval(1000) // Set a short refresh interval to see changes
        }
      }
    } catch (error) {
      console.error('Failed to update container:', error)
      toast.error(
        `Failed to update container: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  if (isLoadingDaemonSet) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <IconLoader className="animate-spin" />
              <span>Loading DaemonSet details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isDaemonSetError || !daemonset) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <IconExclamationCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
              Error loading DaemonSet:{' '}
              {daemonsetError?.message || 'DaemonSet not found'}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { metadata, spec, status } = daemonset
  const readyReplicas = status?.numberReady || 0
  const desiredReplicas = status?.desiredNumberScheduled || 0
  const currentReplicas = status?.currentNumberScheduled || 0
  const availableReplicas = status?.numberAvailable || 0

  const isAvailable = availableReplicas > 0
  const isPending = currentReplicas < desiredReplicas

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{metadata?.name}</h1>
          <p className="text-muted-foreground">
            Namespace: <span className="font-medium">{namespace}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={isLoadingDaemonSet}
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <IconRefresh className="w-4 h-4" />
            Refresh
          </Button>
          <Popover
            open={isRestartPopoverOpen}
            onOpenChange={setIsRestartPopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <IconReload className="w-4 h-4" />
                Restart
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Restart DaemonSet</h4>
                  <p className="text-sm text-muted-foreground">
                    This will restart all pods managed by this DaemonSet. This
                    action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsRestartPopoverOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      handleRestart()
                      setIsRestartPopoverOpen(false)
                    }}
                    className="flex-1"
                  >
                    <IconReload className="w-4 h-4 mr-2" />
                    Restart
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
              <div className="space-y-6">
                {/* Status Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <IconExclamationCircle className="w-4 h-4 fill-gray-500" />
                          ) : isAvailable ? (
                            <IconCircleCheckFilled className="w-4 h-4 fill-green-500" />
                          ) : (
                            <IconLoader className="w-4 h-4 animate-spin fill-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>
                          <p className="text-sm font-medium">
                            {isPending
                              ? 'Pending'
                              : isAvailable
                                ? 'Available'
                                : 'In Progress'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Ready Replicas
                        </p>
                        <p className="text-sm font-medium">
                          {readyReplicas} / {desiredReplicas}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Current Scheduled
                        </p>
                        <p className="text-sm font-medium">{currentReplicas}</p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Desired Scheduled
                        </p>
                        <p className="text-sm font-medium">{desiredReplicas}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* DaemonSet Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>DaemonSet Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Created
                        </Label>
                        <p className="text-sm">
                          {formatDate(metadata?.creationTimestamp || '', true)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Strategy
                        </Label>
                        <p className="text-sm">
                          {spec?.updateStrategy?.type || 'RollingUpdate'}
                        </p>
                      </div>
                    </div>
                    <LabelsAnno
                      labels={metadata?.labels || {}}
                      annotations={metadata?.annotations || {}}
                    />
                  </CardContent>
                </Card>

                {/* Containers */}
                {spec?.template?.spec?.containers && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Containers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {spec.template.spec.containers.map(
                          (container, index) => (
                            <ContainerTable
                              key={index}
                              container={container}
                              onContainerUpdate={handleContainerUpdate}
                            />
                          )
                        )}
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
                <YamlEditor
                  key={refreshKey}
                  value={yamlContent}
                  title="DaemonSet Configuration"
                  onSave={handleSaveYaml}
                  onChange={handleYamlChange}
                  isSaving={isSavingYaml}
                />
              </div>
            ),
          },
          ...(relatedPods
            ? [
                {
                  value: 'pods',
                  label: (
                    <>
                      Pods{' '}
                      {relatedPods && (
                        <Badge variant="secondary">{relatedPods.length}</Badge>
                      )}
                    </>
                  ),
                  content: (
                    <PodTable
                      pods={relatedPods}
                      isLoading={isLoadingPods}
                      labelSelector={labelSelector}
                    />
                  ),
                },
                {
                  value: 'logs',
                  label: 'Logs',
                  content: (
                    <div className="space-y-6">
                      <LogViewer
                        namespace={namespace}
                        pods={relatedPods}
                        containers={
                          relatedPods?.[0]?.spec?.containers?.map(
                            (container) => ({
                              name: container.name,
                              image: container.image || '',
                            })
                          ) || []
                        }
                      />
                    </div>
                  ),
                },
                {
                  value: 'terminal',
                  label: 'Terminal',
                  content: (
                    <div className="space-y-6">
                      {relatedPods && relatedPods.length > 0 && (
                        <Terminal
                          namespace={namespace}
                          pods={relatedPods}
                          containers={
                            relatedPods[0].spec?.containers?.map(
                              (container) => ({
                                name: container.name,
                                image: container.image || '',
                              })
                            ) || []
                          }
                        />
                      )}
                    </div>
                  ),
                },
              ]
            : []),
          ...(spec?.template?.spec?.volumes
            ? [
                {
                  value: 'volumes',
                  label: (
                    <>
                      Volumes
                      {spec.template.spec.volumes && (
                        <Badge variant="secondary">
                          {spec.template.spec.volumes.length}
                        </Badge>
                      )}
                    </>
                  ),
                  content: (
                    <div className="space-y-6">
                      <VolumeTable
                        namespace={namespace}
                        volumes={spec.template.spec?.volumes}
                        containers={spec.template.spec?.containers}
                        isLoading={isLoadingDaemonSet}
                      />
                    </div>
                  ),
                },
              ]
            : []),
          {
            value: 'events',
            label: 'Events',
            content: (
              <EventTable
                resource="daemonsets"
                name={name}
                namespace={namespace}
              />
            ),
          },
          {
            value: 'monitor',
            label: 'Monitor',
            content: (
              <PodMonitoring
                namespace={namespace}
                pods={relatedPods}
                containers={relatedPods?.[0]?.spec?.containers || []}
                defaultQueryName={relatedPods?.[0]?.metadata?.generateName}
                labelSelector={labelSelector}
              />
            ),
          },
        ]}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        resourceName={metadata?.name || ''}
        resourceType="DaemonSet"
      />
    </div>
  )
}
