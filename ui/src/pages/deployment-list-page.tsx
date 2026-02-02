import { useCallback, useEffect, useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Deployment } from 'kubernetes-types/apps/v1'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { scaleDeployment } from '@/lib/api'
import { getDeploymentStatus } from '@/lib/k8s'
import { formatDate, translateError } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeploymentStatusIcon } from '@/components/deployment-status-icon'
import { DeploymentCreateDialog } from '@/components/editors/deployment-create-dialog'
import { ResourceTable } from '@/components/resource-table'

function DeploymentScaleCell({ deployment }: { deployment: Deployment }) {
  const { t } = useTranslation()
  const [replicas, setReplicas] = useState<number>(
    deployment.spec?.replicas ?? deployment.status?.replicas ?? 0
  )
  const [isScaling, setIsScaling] = useState(false)

  useEffect(() => {
    setReplicas(deployment.spec?.replicas ?? deployment.status?.replicas ?? 0)
  }, [deployment.spec?.replicas, deployment.status?.replicas])

  const namespace = deployment.metadata?.namespace
  const name = deployment.metadata?.name
  const canScale = Boolean(namespace && name)

  const handleScale = useCallback(
    async (nextReplicas: number) => {
      if (!canScale || nextReplicas < 0) return
      setIsScaling(true)
      try {
        await scaleDeployment(namespace!, name!, nextReplicas)
        setReplicas(nextReplicas)
        toast.success(
          t('detail.status.scaledTo', {
            resource: 'Deployment',
            replicas: nextReplicas,
          })
        )
      } catch (error) {
        console.error('Failed to scale deployment:', error)
        toast.error(translateError(error, t))
      } finally {
        setIsScaling(false)
      }
    },
    [canScale, namespace, name, t]
  )

  if (!canScale) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleScale(replicas - 1)}
        disabled={isScaling || replicas <= 0}
      >
        -
      </Button>
      <span className="min-w-6 text-center text-sm">{replicas}</span>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleScale(replicas + 1)}
        disabled={isScaling}
      >
        +
      </Button>
    </div>
  )
}

export function DeploymentListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Define column helper outside of any hooks
  const columnHelper = createColumnHelper<Deployment>()

  // Define columns for the deployment table
  const columns = useMemo(
    () => [
      columnHelper.accessor('metadata.name', {
        header: t('common.name'),
        cell: ({ row }) => (
          <div className="font-medium text-blue-500 hover:underline">
            <Link
              to={`/deployments/${row.original.metadata!.namespace}/${
                row.original.metadata!.name
              }`}
            >
              {row.original.metadata!.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.status?.readyReplicas ?? 0, {
        id: 'ready',
        header: t('deployments.ready'),
        cell: ({ row }) => {
          const status = row.original.status
          const ready = status?.readyReplicas || 0
          const desired = status?.replicas || 0
          return (
            <div>
              {ready} / {desired}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'scale',
        header: t('detail.buttons.scale'),
        cell: ({ row }) => <DeploymentScaleCell deployment={row.original} />,
        enableSorting: false,
      }),
      columnHelper.accessor('status.conditions', {
        header: t('common.status'),
        cell: ({ row }) => {
          const status = getDeploymentStatus(row.original)
          return (
            <Badge variant="outline" className="text-muted-foreground px-1.5">
              <DeploymentStatusIcon status={status} />
              {status}
            </Badge>
          )
        },
      }),
      columnHelper.accessor('metadata.creationTimestamp', {
        header: t('common.created'),
        cell: ({ getValue }) => {
          const dateStr = formatDate(getValue() || '')

          return (
            <span className="text-muted-foreground text-sm">{dateStr}</span>
          )
        },
      }),
    ],
    [columnHelper, t]
  )

  // Custom filter for deployment search
  const deploymentSearchFilter = useCallback(
    (deployment: Deployment, query: string) => {
      return (
        deployment.metadata!.name!.toLowerCase().includes(query) ||
        (deployment.metadata!.namespace?.toLowerCase() || '').includes(query)
      )
    },
    []
  )

  const handleCreateClick = () => {
    setIsCreateDialogOpen(true)
  }

  const handleCreateSuccess = (deployment: Deployment, namespace: string) => {
    // Navigate to the newly created deployment's detail page
    navigate(`/deployments/${namespace}/${deployment.metadata?.name}`)
  }

  return (
    <>
      <ResourceTable
        resourceName="Deployments"
        columns={columns}
        searchQueryFilter={deploymentSearchFilter}
        showCreateButton={true}
        onCreateClick={handleCreateClick}
      />

      <DeploymentCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </>
  )
}
