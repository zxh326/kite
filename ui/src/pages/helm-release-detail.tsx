import { useEffect, useMemo, useState } from 'react'
import {
  IconCircleCheckFilled,
  IconExclamationCircle,
  IconLoader,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react'
import * as yaml from 'js-yaml'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { clusterScopeResources, HelmRelease, ResourceType } from '@/types/api'
import { deleteResource, updateResource, useResource } from '@/lib/api'
import { formatDate, translateError } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { DescribeDialog } from '@/components/describe-dialog'
import { ErrorMessage } from '@/components/error-message'
import { HelmReleaseHistoryTable } from '@/components/helm-release-history-table'
import { LabelsAnno } from '@/components/lables-anno'
import { YamlEditor } from '@/components/yaml-editor'

interface ManifestResource {
  kind: string
  apiVersion?: string
  metadata?: {
    name: string
    namespace?: string
  }
}

export function HelmReleaseDetail(props: { namespace: string; name: string }) {
  const { namespace, name } = props
  const [valuesYaml, setValuesYaml] = useState('')
  const [isSavingValues, setIsSavingValues] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const {
    data: release,
    isLoading,
    isError,
    error,
    refetch,
  } = useResource('helmreleases', name, namespace)

  const manifestResources = useMemo(() => {
    if (!release?.spec?.manifest) return []

    try {
      const docs = release.spec.manifest
        .split(/^---$/m)
        .map((doc) => doc.trim())
        .filter((doc) => doc.length > 0)

      const resources: ManifestResource[] = []
      for (const doc of docs) {
        try {
          const parsed = yaml.load(doc) as ManifestResource
          if (parsed && parsed.kind && parsed.metadata?.name) {
            resources.push(parsed)
          }
        } catch {
          // Skip invalid YAML documents
        }
      }
      return resources
    } catch {
      return []
    }
  }, [release?.spec?.manifest])

  useEffect(() => {
    if (release) {
      if (release.spec?.values) {
        setValuesYaml(yaml.dump(release.spec.values, { indent: 2 }))
      }
    }
  }, [release])

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
    refetch()
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteResource('helmreleases', name, namespace)
      toast.success('Helm Release deleted successfully')
      navigate(`/helmreleases`)
    } catch (error) {
      toast.error(translateError(error, t))
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleSaveValues = async () => {
    setIsSavingValues(true)
    try {
      // Parse the values YAML content to get the values object
      const parsedValues = yaml.load(valuesYaml) as Record<string, unknown>

      // Create the update payload with the parsed values
      const updatePayload: HelmRelease = {
        ...release!,
        spec: {
          ...release!.spec,
          values: parsedValues,
        },
      }

      await updateResource('helmreleases', name, namespace, updatePayload)
      toast.success('Helm values updated successfully')
      setTimeout(() => {
        refetch()
      }, 1000)
    } catch (error) {
      console.error('Failed to update helm values:', error)
      toast.error(translateError(error, t))
    } finally {
      setIsSavingValues(false)
    }
  }

  const handleValuesChange = (content: string) => {
    setValuesYaml(content)
  }

  const handleResourceClick = (resource: ManifestResource) => {
    const kind = resource.kind.toLowerCase()
    const kindMap: Record<string, ResourceType> = {
      ingress: 'ingresses',
    }
    const resourceType = (kindMap[kind] || `${kind}s`) as ResourceType
    const resourceName = resource.metadata?.name
    const isClusterScope =
      resourceType && clusterScopeResources.includes(resourceType)

    if (resourceName) {
      navigate(
        `/${resourceType}${!isClusterScope ? `/${namespace}` : ''}/${resourceName}`
      )
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <IconLoader className="animate-spin" />
              <span>Loading Helm Release details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError || !release) {
    return (
      <ErrorMessage
        resourceName={'Helm Release'}
        error={error}
        refetch={handleRefresh}
      />
    )
  }

  const { metadata, spec, status } = release
  const chartMeta = spec?.chart?.metadata

  const getStatusIcon = () => {
    const s = status?.status?.toLowerCase()
    if (s === 'deployed' || s === 'superseded') {
      return <IconCircleCheckFilled className="w-5 h-5 text-green-500" />
    }
    if (s === 'failed' || s === 'uninstalled') {
      return <IconExclamationCircle className="w-5 h-5 text-red-500" />
    }
    return <IconLoader className="w-5 h-5 text-yellow-500" />
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{name}</h1>
          <p className="text-muted-foreground">
            Namespace: <span className="font-medium">{namespace}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <IconRefresh className="w-4 h-4" />
            Refresh
          </Button>
          <DescribeDialog
            resourceType="helmreleases"
            namespace={namespace}
            name={name}
          />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isDeleting}
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
                <Card>
                  <CardHeader>
                    <CardTitle>Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon()}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>
                          <p className="text-sm font-medium">
                            {status?.status || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Chart Version
                        </p>
                        <p className="text-sm font-medium">
                          {chartMeta?.version || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          App Version
                        </p>
                        <p className="text-sm font-medium">
                          {chartMeta?.appVersion || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Revision
                        </p>
                        <p className="text-sm font-medium">
                          {metadata?.resourceVersion || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Release Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Chart Name
                        </Label>
                        <p className="text-sm">{chartMeta?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          First Deployed
                        </Label>
                        <p className="text-sm">
                          {status?.first_deployed
                            ? formatDate(status.first_deployed, true)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Last Deployed
                        </Label>
                        <p className="text-sm">
                          {status?.last_deployed
                            ? formatDate(status.last_deployed, true)
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Description
                        </Label>
                        <p className="text-sm">
                          {status?.description || 'No description'}
                        </p>
                      </div>
                      {chartMeta?.home && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Home
                          </Label>
                          <a
                            href={chartMeta.home}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline"
                          >
                            {chartMeta.home}
                          </a>
                        </div>
                      )}
                      {chartMeta?.description && (
                        <div className="md:col-span-2">
                          <Label className="text-xs text-muted-foreground">
                            Chart Description
                          </Label>
                          <p className="text-sm">{chartMeta.description}</p>
                        </div>
                      )}
                    </div>
                    <LabelsAnno
                      labels={metadata?.labels || {}}
                      annotations={metadata?.annotations || {}}
                    />
                  </CardContent>
                </Card>

                {status?.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap">
                        {status.notes}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ),
          },
          {
            value: 'values',
            label: 'Values',
            content: (
              <YamlEditor
                key={`values-${refreshKey}`}
                value={valuesYaml}
                title="Helm Values"
                onSave={async () => await handleSaveValues()}
                onChange={handleValuesChange}
                isSaving={isSavingValues}
              />
            ),
          },
          {
            value: 'manifest',
            label: (
              <>
                Resources{' '}
                <Badge variant="secondary">{manifestResources.length}</Badge>
              </>
            ),
            content: (
              <Card>
                <CardHeader>
                  <CardTitle>Deployed Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  {manifestResources.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No resources found in manifest
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kind</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Namespace</TableHead>
                          <TableHead>API Version</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manifestResources.map((resource, index) => {
                          return (
                            <TableRow
                              key={index}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => handleResourceClick(resource)}
                            >
                              <TableCell className="font-medium">
                                {resource.kind}
                              </TableCell>
                              <TableCell>
                                {resource.metadata?.name || 'N/A'}
                              </TableCell>
                              <TableCell>
                                {resource.metadata?.namespace || namespace}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {resource.apiVersion || 'N/A'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'history',
            label: 'History',
            content: (
              <HelmReleaseHistoryTable
                namespace={namespace}
                name={name}
                currentRelease={release}
              />
            ),
          },
        ]}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        resourceName={name}
        resourceType="Helm Release"
        namespace={namespace}
        isDeleting={isDeleting}
      />
    </div>
  )
}
