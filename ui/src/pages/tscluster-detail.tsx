import { useCallback, useEffect, useState } from 'react'
import {
    IconLoader,
    IconRefresh,
    IconReload,
    IconScale,
    IconTrash,
    IconInfoCircleFilled,
} from '@tabler/icons-react'
import * as yaml from 'js-yaml'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TypesenseClusterStatusIcon, TypesenseClusterReadyIcon, TypesenseClusterReadyDisplay } from '@/components/tscluster-status-icon'
import { TypesenseClusterStatusDisplay } from '@/components/tscluster-status-display'

import { toast } from 'sonner'
import {
    patchResource,
    updateResource,
    useResource,
    //   useResourcesWatch,
} from '@/lib/api'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { ResourceType, ResourceTypeMap } from '@/types/api'
import { getOwnerInfo } from '@/lib/k8s'
import { formatDate, translateError } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { ErrorMessage } from '@/components/error-message'
import { EventTable } from '@/components/event-table'
import { LabelsAnno } from '@/components/lables-anno'
import { RelatedResourcesTable } from '@/components/related-resource-table'
import { ResourceDeleteConfirmationDialog } from '@/components/resource-delete-confirmation-dialog'
import { ResourceHistoryTable } from '@/components/resource-history-table'
import { YamlEditor } from '@/components/yaml-editor'
import { Badge } from '@/components/ui/badge'
import { SimpleResourceDetail } from './simple-resource-detail'
import { ServiceDetail } from './service-detail'
import { SecretDetail } from './secret-detail'
import { StatefulSetDetail } from './statefulset-detail'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function TypesenseClusterDetail<T extends ResourceType>(props: {
    resourceType: T
    name: string
    namespace?: string
}) {
    const { namespace, name, resourceType } = props
    const [scaleReplicas, setScaleReplicas] = useState<number>(1)
    const [yamlContent, setYamlContent] = useState('')
    const [isSavingYaml, setIsSavingYaml] = useState(false)
    const [isScalePopoverOpen, setIsScalePopoverOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const [refreshInterval, setRefreshInterval] = useState<number>(5000)
    const { t } = useTranslation()

    // const {
    //     data,
    //     isLoading,
    //     isError,
    //     error,
    //     refetch: handleRefresh,
    // } = useResource(resourceType, name, namespace)

    // Fetch deployment data
    const {
        data,
        isLoading: isLoadingTypesenseCluster,
        isError: isTypesenseClusterError,
        error: typesenseClusterError,
        refetch: refetchTypesenseCluster,
    } = useResource('typesense', name, namespace, {
        refreshInterval,
    })


    useEffect(() => {
        if (data) {
            setYamlContent(yaml.dump(data, { indent: 2 }))
            // setScaleReplicas(data.spec?.replicas || 1)
        }
    }, [data])

    // Auto-reset refresh interval when deployment reaches stable state
    //   useEffect(() => {
    //     if (deployment) {
    //       const status = getDeploymentStatus(deployment)
    //       const isStable =
    //         status === 'Available' ||
    //         status === 'Scaled Down' ||
    //         status === 'Paused'

    //       if (isStable) {
    //         const timer = setTimeout(() => {
    //           setRefreshInterval(0)
    //         }, 2000)
    //         return () => clearTimeout(timer)
    //       } else {
    //         setRefreshInterval(1000)
    //       }
    //     }
    //   }, [deployment, refreshInterval])

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1)
        refetchTypesenseCluster()
    }

    const handleScale = useCallback(async () => {
        if (!data) return

        try {
            const updatedDeployment = {
                spec: {
                    replicas: scaleReplicas,
                },
            }
            await patchResource('typesense', name, namespace, updatedDeployment)
            toast.success(`Typesense Cluster scaled to ${scaleReplicas} replicas`)
            setIsScalePopoverOpen(false)
            setRefreshInterval(1000)
        } catch (error) {
            console.error('Failed to restart deployment:', error)
            toast.error(translateError(error, t))
        }
    }, [t, data, name, namespace, scaleReplicas])

    const handleSaveYaml = async (content: ResourceTypeMap[T]) => {
        setIsSavingYaml(true)
        try {
            await updateResource(resourceType, name, namespace, content)
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

    if (isLoadingTypesenseCluster) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center gap-2">
                            <IconLoader className="animate-spin" />
                            <span>Loading {resourceType.slice(0, -1)} details...</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (isTypesenseClusterError || !data) {
        return (
            <ErrorMessage
                resourceName={resourceType.slice(0, -1)}
                error={typesenseClusterError}
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
                    {namespace && (
                        <p className="text-muted-foreground">
                            Namespace: <span className="font-medium">{namespace}</span>
                        </p>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        disabled={isLoadingTypesenseCluster}
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                    >
                        <IconRefresh className="w-4 h-4" />
                        Refresh
                    </Button>
                    <Popover
                        open={isScalePopoverOpen}
                        onOpenChange={setIsScalePopoverOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                                <IconScale className="w-4 h-4" />
                                Scale
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium">Scale Typesense Cluster</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Adjust the number of replicas for this Typesense Cluster.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="replicas">Replicas</Label>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 w-9 p-0"
                                            onClick={() =>
                                                setScaleReplicas(Math.max(0, scaleReplicas - 1))
                                            }
                                            disabled={scaleReplicas <= 0}
                                        >
                                            -
                                        </Button>
                                        <Input
                                            id="replicas"
                                            type="number"
                                            min="0"
                                            value={scaleReplicas}
                                            onChange={(e) =>
                                                setScaleReplicas(parseInt(e.target.value) || 0)
                                            }
                                            className="text-center"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 w-9 p-0"
                                            onClick={() => setScaleReplicas(scaleReplicas + 1)}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>
                                <Button onClick={handleScale} className="w-full">
                                    <IconScale className="w-4 h-4 mr-2" />
                                    Scale
                                </Button>
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
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Status Overview</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <TypesenseClusterReadyIcon statusData={data?.status?.conditions} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Status
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        <TypesenseClusterReadyDisplay statusData={data?.status?.conditions} />
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Version
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.image}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Desired Replicas
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.replicas || 0}
                                                </p>
                                            </div>

                                        </div>

                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Cluster Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <TypesenseClusterStatusIcon status={data?.status?.phase} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Phase
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        <TypesenseClusterStatusDisplay status={data?.status?.phase} />
                                                    </p>
                                                </div>

                                            </div>


                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    API Port
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.apiPort || 0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Peering Port
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.peeringPort || 0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Created
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {formatDate(data?.metadata?.creationTimestamp || '')}
                                                </p>
                                            </div>
                                            <div>

                                                <p className="text-xs text-muted-foreground">
                                                    Enable CORS
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.enableCors === true ? 'true' : 'false'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Reset Peers on Error
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.resetPeersOnError === true ? 'true' : 'false'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Incremental Quorum Recovery
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.incrementalQuorumRecovery === true ? 'true' : 'false'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Allowed CORS Domains
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.corsDomains || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Health Probe Timeout(msec)
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.healthProbeTimeoutInMilliseconds || '500'}
                                                </p>
                                            </div>
                                            <div></div>
                                        </div>
                                        <LabelsAnno
                                            labels={data.metadata?.labels || {}}
                                            annotations={data.metadata?.annotations || {}}
                                        />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Storage Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Storage Class
                                                </p>
                                                <p className="text-sm">
                                                    <Badge variant="outline">
                                                        {data?.spec?.storage?.storageClassName || 'standard'}
                                                    </Badge>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Size
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.storage?.size || '100Mi'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Resources
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.storage?.size || '100Mi'}
                                                </p>
                                            </div>
                                        </div>

                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Metrics Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Prometheus Helm Release
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.metrics?.release || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Sidecar Image
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.metrics?.image || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Scrape Interval(sec)
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.metrics?.interval || '-'}
                                                </p>
                                            </div>
                                        </div>

                                    </CardContent>
                                </Card>

                                {data.status?.conditions && data.status.conditions.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Conditions</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {data.status.conditions.map((condition, index) => (
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
                                <YamlEditor
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
                        value: 'Configuration',
                        label: 'Configuration',
                        content: (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Typesense Admin API Key</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <SecretDetail
                                            name={data?.spec?.adminApiKey?.name}
                                            namespace={namespace}
                                            isNested={true}
                                            isReadOnly={true}
                                        />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            Typesense Environment Variables
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>
                                                        <IconInfoCircleFilled className="inline-block ml-2 w-4 h-4" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>
                                                        Insert or update Typesense server environment variables<br />
                                                        directly inside the ConfigMap YAML.
                                                    </p><br />
                                                    <p>
                                                        More info under <Link to='https://typesense.org/docs/latest/api/server-configuration.html' className='hover:underline'>"Server Configuration"</Link> in official documentation.
                                                    </p>

                                                </TooltipContent>
                                            </Tooltip>


                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <SimpleResourceDetail
                                            resourceType='configmaps'
                                            name={data?.spec?.additionalServerConfiguration?.name}
                                            namespace={namespace}
                                            isNested={true}
                                        />
                                    </CardContent>
                                </Card>
                            </>
                        ),
                    },
                    {
                        value: 'Quorum',
                        label: 'Quorum',
                        content: (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Quorum Overview</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <TypesenseClusterReadyIcon statusData={data?.status?.conditions} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Cluster Status
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        <TypesenseClusterReadyDisplay statusData={data?.status?.conditions} />

                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2">
                                                    <TypesenseClusterStatusIcon status={data?.status?.phase} />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Evalutation Phase
                                                    </p>
                                                    <p className="text-sm font-medium">
                                                        <TypesenseClusterStatusDisplay status={data?.status?.phase} />
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Desired Replicas
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {data?.spec?.replicas || 0}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Required Healthy Replicas
                                                </p>
                                                <p className="text-sm font-medium">
                                                    {Math.ceil((data?.spec?.replicas ?? 1) - ((data?.spec?.replicas ?? 1) - 1) / 2) || 0}
                                                </p>
                                            </div>

                                        </div>

                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Quorum Information</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <StatefulSetDetail
                                            name={`${name}-sts`}
                                            namespace={namespace}
                                            isNested={true}
                                            isReadOnly={true}
                                        />
                                    </CardContent>
                                </Card>
                            </>

                        ),
                    },
                    {
                        value: 'Services',
                        label: 'Services',
                        content: (
                            <>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Service</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ServiceDetail
                                            name={`${name}-svc`}
                                            namespace={namespace}
                                            isNested={true}
                                            isReadOnly={true}
                                        />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Headless Service</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <SimpleResourceDetail
                                            resourceType='services'
                                            name={`${name}-sts-svc`}
                                            namespace={namespace}
                                            isNested={true}
                                            isReadOnly={true}
                                        />
                                    </CardContent>
                                </Card>
                            </>
                        ),
                    },
                    {
                        value: 'Ingress',
                        label: 'Ingress',
                        content: (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Ingress</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <SimpleResourceDetail
                                        resourceType='ingresses'
                                        name={`${name}-reverse-proxy`}
                                        namespace={namespace}
                                        isNested={true}
                                        isReadOnly={true}
                                    />
                                </CardContent>
                            </Card>

                        ),
                    },
                    {
                        value: 'Scrapers',
                        label: 'Scrapers',
                        content: (
                            <RelatedResourcesTable
                                resource={resourceType}
                                name={name}
                                namespace={namespace}
                            />
                        ),
                    },
                    {
                        value: 'events',
                        label: 'Events',
                        content: (
                            <EventTable
                                resource={resourceType}
                                namespace={namespace}
                                name={name}
                            />
                        ),
                    },
                    {
                        value: 'history',
                        label: 'History',
                        content: (
                            <ResourceHistoryTable
                                resourceType={resourceType}
                                name={name}
                                namespace={namespace}
                                currentResource={data}
                            />
                        ),
                    },
                ]}
            />

            <ResourceDeleteConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                resourceName={name}
                resourceType={resourceType}
                namespace={namespace}
            />
        </div>
    )
}
