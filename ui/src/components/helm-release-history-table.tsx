import { useMemo, useRef, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { IconEye, IconLoader } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { formatHex } from 'culori'
import * as yaml from 'js-yaml'
import { editor as monacoEditor } from 'monaco-editor'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { HelmRelease } from '@/types/api'
import { apiClient } from '@/lib/api-client'
import { formatDate, translateError } from '@/lib/utils'

import { useAppearance } from './appearance-provider'
import { Column, SimpleTable } from './simple-table'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

interface HelmReleaseHistoryProps {
  namespace: string
  name: string
  currentRelease?: HelmRelease
}

interface HelmReleaseList {
  items: HelmRelease[]
}

export function HelmReleaseHistoryTable({
  namespace,
  name,
  currentRelease,
}: HelmReleaseHistoryProps) {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRevision, setSelectedRevision] = useState<HelmRelease | null>(
    null
  )
  const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const pageSize = 10

  const {
    data: historyData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<HelmReleaseList>({
    queryKey: ['helm-history', namespace, name],
    queryFn: async () => {
      const response = await apiClient.get<HelmReleaseList>(
        `/helmreleases/${namespace}/${name}/history`
      )
      return response
    },
    staleTime: 30000,
  })

  // Sort history by revision number in descending order
  const sortedHistory = useMemo(() => {
    const items = historyData?.items || []
    return [...items].sort((a, b) => {
      const revA = parseInt(a.metadata?.resourceVersion || '0', 10)
      const revB = parseInt(b.metadata?.resourceVersion || '0', 10)
      return revB - revA // Descending order
    })
  }, [historyData])

  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedHistory.slice(startIndex, endIndex)
  }, [sortedHistory, currentPage, pageSize])

  const totalItems = sortedHistory.length

  const currentRevision = useMemo(() => {
    return parseInt(currentRelease?.metadata?.resourceVersion || '0', 10)
  }, [currentRelease])

  const handleViewDiff = (revision: HelmRelease) => {
    setSelectedRevision(revision)
    setIsDiffDialogOpen(true)
  }

  const handleRollback = async () => {
    if (!selectedRevision) return

    const revision = parseInt(
      selectedRevision.metadata?.resourceVersion || '0',
      10
    )

    setIsRollingBack(true)
    try {
      await apiClient.post(`/helmreleases/${namespace}/${name}/rollback`, {
        revision,
      })

      toast.success(`Successfully rolled back to revision ${revision}`)
      setIsDiffDialogOpen(false)

      // Refetch history after rollback
      setTimeout(() => {
        refetch()
        window.location.reload() // Reload to get the updated current release
      }, 1000)
    } catch (error) {
      console.error('Failed to rollback release:', error)
      toast.error(translateError(error, t))
    } finally {
      setIsRollingBack(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'deployed':
        return 'default'
      case 'superseded':
        return 'secondary'
      case 'failed':
        return 'destructive'
      case 'uninstalled':
        return 'outline'
      case 'pending-install':
      case 'pending-upgrade':
      case 'pending-rollback':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const currentValuesYaml = useMemo(() => {
    if (!currentRelease?.spec?.values) return ''
    try {
      return yaml.dump(currentRelease.spec.values, {
        indent: 2,
        sortKeys: true,
      })
    } catch {
      return ''
    }
  }, [currentRelease])

  const selectedValuesYaml = useMemo(() => {
    if (!selectedRevision?.spec?.values) return ''
    try {
      return yaml.dump(selectedRevision.spec.values, {
        indent: 2,
        sortKeys: true,
      })
    } catch {
      return ''
    }
  }, [selectedRevision])

  const { actualTheme, colorTheme } = useAppearance()
  const editorRef = useRef<monacoEditor.IStandaloneDiffEditor | null>(null)

  const getCardBackgroundColor = () => {
    const card = getComputedStyle(document.documentElement)
      .getPropertyValue('--background')
      .trim()
    if (!card) {
      return actualTheme === 'dark' ? '#18181b' : '#ffffff'
    }
    return formatHex(card) || (actualTheme === 'dark' ? '#18181b' : '#ffffff')
  }

  const handleEditorDidMount = (editor: monacoEditor.IStandaloneDiffEditor) => {
    editorRef.current = editor
  }

  const columns: Column<HelmRelease>[] = [
    {
      header: 'Revision',
      accessor: (item) => {
        const rev = item.metadata?.resourceVersion || 'N/A'
        const isCurrent = parseInt(rev, 10) === currentRevision
        return { rev, isCurrent }
      },
      cell: (value) => {
        const { rev } = value as { rev: string; isCurrent: boolean }
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{rev}</span>
          </div>
        )
      },
    },
    {
      header: 'Status',
      accessor: (item) => item.status?.status || 'Unknown',
      cell: (value) => (
        <Badge variant={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      ),
    },
    {
      header: 'Chart',
      accessor: (item) => {
        const chartName = item.spec?.chart?.metadata?.name
        const chartVersion = item.spec?.chart?.metadata?.version
        return chartName && chartVersion
          ? `${chartName}-${chartVersion}`
          : 'N/A'
      },
      cell: (value) => value as string,
    },
    {
      header: 'App Version',
      accessor: (item) => item.spec?.chart?.metadata?.appVersion || 'N/A',
      cell: (value) => value as string,
    },
    {
      header: 'Description',
      accessor: (item) => item.status?.description || 'No description',
      cell: (value) => (
        <span className="text-muted-foreground text-sm max-w-xs truncate block">
          {value as string}
        </span>
      ),
    },
    {
      header: 'Updated',
      accessor: (item) => {
        const date =
          item.status?.last_deployed || item.metadata.creationTimestamp
        return date ? formatDate(date, true) : 'N/A'
      },
      cell: (value) => value as string,
    },
    {
      header: 'Actions',
      accessor: (item) => item,
      cell: (value) => {
        const item = value as HelmRelease
        const rev = parseInt(item.metadata?.resourceVersion || '0', 10)
        const isCurrent = rev === currentRevision

        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDiff(item)}
            disabled={isCurrent}
          >
            <IconEye className="w-4 h-4 mr-1" />
            {isCurrent ? 'Current' : 'Diff'}
          </Button>
        )
      },
    },
  ]

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 py-8">
            <IconLoader className="animate-spin" />
            <span>Loading history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive py-8">
            Error loading history:{' '}
            {(error as Error)?.message || 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (sortedHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Release History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No history available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            Release History ({sortedHistory.length} revision
            {sortedHistory.length !== 1 ? 's' : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleTable
            data={paginatedHistory}
            columns={columns}
            pagination={{
              enabled: totalItems > pageSize,
              pageSize,
              currentPage,
              onPageChange: setCurrentPage,
              showPageInfo: true,
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={isDiffDialogOpen} onOpenChange={setIsDiffDialogOpen}>
        <DialogContent className="!max-w-6xl sm:!max-w-6xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="text-lg font-bold">
                Revision {selectedRevision?.metadata?.resourceVersion} vs
                Current ({currentRevision})
              </span>
              <div className="flex items-center gap-2 mr-4">
                <Button
                  onClick={handleRollback}
                  disabled={isRollingBack}
                  size="sm"
                >
                  {isRollingBack
                    ? t('common.loading', 'loading')
                    : t('common.rollback', 'rollback')}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <DiffEditor
              height={500}
              language="yaml"
              beforeMount={(monaco) => {
                const cardBgColor = getCardBackgroundColor()
                monaco.editor.defineTheme(`custom-dark-${colorTheme}`, {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [],
                  colors: {
                    'editor.background': cardBgColor,
                  },
                })
                monaco.editor.defineTheme(`custom-vs-${colorTheme}`, {
                  base: 'vs',
                  inherit: true,
                  rules: [],
                  colors: {
                    'editor.background': cardBgColor,
                  },
                })
              }}
              theme={
                actualTheme === 'dark'
                  ? `custom-dark-${colorTheme}`
                  : `custom-vs-${colorTheme}`
              }
              options={{
                readOnly: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                folding: true,
                lineNumbers: 'relative',
                fontSize: 14,
                fontFamily:
                  "'Maple Mono',Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
                renderSideBySide: true,
                enableSplitViewResizing: true,
                renderOverviewRuler: true,
                overviewRulerBorder: true,
                overviewRulerLanes: 2,
              }}
              onMount={handleEditorDidMount}
              original={selectedValuesYaml}
              modified={currentValuesYaml}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
