import { useEffect, useState } from 'react'
import { IconEdit, IconServer } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'

import { Cluster } from '@/types/api'
import { ClusterCreateRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface ClusterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cluster?: Cluster | null
  onSubmit: (clusterData: ClusterCreateRequest) => void
}

export function ClusterDialog({
  open,
  onOpenChange,
  cluster,
  onSubmit,
}: ClusterDialogProps) {
  const { t } = useTranslation()
  const isEditMode = !!cluster

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    config: '',
    prometheusURL: '',
    enabled: true,
    isDefault: false,
    inCluster: false,
    secret_name: '',
    secret_namespace: '',
    secret_key: '',
  })

  useEffect(() => {
    if (cluster) {
      setFormData({
        name: cluster.name,
        description: cluster.description || '',
        config: cluster.config || '',
        prometheusURL: cluster.prometheusURL || '',
        enabled: cluster.enabled,
        isDefault: cluster.isDefault,
        inCluster: cluster.inCluster,
        secret_name: cluster.secret_name || '',
        secret_namespace: cluster.secret_namespace || '',
        secret_key: cluster.secret_key || '',
      })
    }
  }, [cluster, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      config: '',
      prometheusURL: '',
      enabled: true,
      isDefault: false,
      inCluster: false,
      secret_name: '',
      secret_namespace: '',
      secret_key: '',
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen && !isEditMode) {
      // 关闭添加对话框时重置表单
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <IconEdit className="h-5 w-5" />
            ) : (
              <IconServer className="h-5 w-5" />
            )}
            {isEditMode
              ? t('clusterManagement.dialog.edit.title', 'Edit Cluster')
              : t('clusterManagement.dialog.add.title', 'Add New Cluster')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cluster-name">
                {t('clusterManagement.form.name.label', 'Cluster Name')} *
              </Label>
              <Input
                id="cluster-name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder={t(
                  'clusterManagement.form.name.placeholder',
                  'e.g., production, staging'
                )}
                required
              />
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="cluster-type">
                  {t('clusterManagement.form.type.label', 'Cluster Type')}
                </Label>
                <Select
                  value={formData.inCluster ? 'inCluster' : 'external'}
                  onValueChange={(value) =>
                    handleChange('inCluster', value === 'inCluster')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">
                      {t(
                        'clusterManagement.form.type.external',
                        'External Cluster'
                      )}
                    </SelectItem>
                    <SelectItem value="inCluster">
                      {t('clusterManagement.form.type.inCluster', 'In-Cluster')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cluster-description">
              {t('clusterManagement.form.description.label', 'Description')}
            </Label>
            <Textarea
              id="cluster-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t(
                'clusterManagement.form.description.placeholder',
                'Brief description of this cluster'
              )}
              rows={2}
            />
          </div>

          {!formData.inCluster && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  {t('clusterManagement.form.secretRef.title', 'Kubernetes Secret Reference (Optional)')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'clusterManagement.form.secretRef.description',
                    'Read kubeconfig from a Kubernetes secret instead of storing it in the database. Useful for dynamic configurations with GitOps.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="secret-namespace">
                    {t('clusterManagement.form.secretNamespace.label', 'Namespace')}
                  </Label>
                  <Input
                    id="secret-namespace"
                    value={formData.secret_namespace}
                    onChange={(e) => handleChange('secret_namespace', e.target.value)}
                    placeholder={t(
                      'clusterManagement.form.secretNamespace.placeholder',
                      'e.g., kite-system'
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret-name">
                    {t('clusterManagement.form.secretName.label', 'Secret Name')}
                  </Label>
                  <Input
                    id="secret-name"
                    value={formData.secret_name}
                    onChange={(e) => handleChange('secret_name', e.target.value)}
                    placeholder={t(
                      'clusterManagement.form.secretName.placeholder',
                      'e.g., kubeconfig-prod'
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret-key">
                    {t('clusterManagement.form.secretKey.label', 'Key')}
                  </Label>
                  <Input
                    id="secret-key"
                    value={formData.secret_key}
                    onChange={(e) => handleChange('secret_key', e.target.value)}
                    placeholder={t(
                      'clusterManagement.form.secretKey.placeholder',
                      'e.g., config'
                    )}
                  />
                </div>
              </div>

              {formData.secret_name && formData.secret_namespace && formData.secret_key && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {t(
                      'clusterManagement.form.secretRef.note',
                      'Kubeconfig will be read from secret {namespace}/{name} key "{key}". The kubeconfig field below will be ignored.',
                      {
                        namespace: formData.secret_namespace,
                        name: formData.secret_name,
                        key: formData.secret_key,
                      }
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {!formData.inCluster && (
            <div className="space-y-2">
              <Label htmlFor="cluster-config">
                {t('clusterManagement.form.config.label', 'Kubeconfig')}
                {!isEditMode && !(formData.secret_name && formData.secret_namespace && formData.secret_key) && ' *'}
              </Label>
              {isEditMode && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    'clusterManagement.form.config.editNote',
                    'Leave empty to keep current configuration'
                  )}
                </p>
              )}
              {!isEditMode && (formData.secret_name || formData.secret_namespace || formData.secret_key) && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    'clusterManagement.form.config.secretNote',
                    'Optional when using secret reference above'
                  )}
                </p>
              )}
              <Textarea
                id="cluster-config"
                value={formData.config}
                onChange={(e) => handleChange('config', e.target.value)}
                placeholder={t(
                  'clusterManagement.form.kubeconfig.placeholder',
                  'Paste your kubeconfig content here...'
                )}
                rows={8}
                className="text-sm"
                required={!isEditMode && !formData.inCluster && !(formData.secret_name && formData.secret_namespace && formData.secret_key)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="prometheus-url">
              {t(
                'clusterManagement.form.prometheusURL.label',
                'Prometheus URL'
              )}
            </Label>
            <Input
              id="prometheus-url"
              value={formData.prometheusURL}
              onChange={(e) => handleChange('prometheusURL', e.target.value)}
              type="url"
            />
          </div>

          {/* Cluster Status Controls */}
          <div className="space-y-4 border-t pt-4">
            {/* Enabled Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="cluster-enabled">
                  {t('clusterManagement.form.enabled.label', 'Enable Cluster')}
                </Label>
              </div>
              <Switch
                id="cluster-enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => handleChange('enabled', checked)}
              />
            </div>

            {/* Default Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="cluster-default">
                  {t(
                    'clusterManagement.form.isDefault.label',
                    'Set as Default'
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'clusterManagement.form.isDefault.help',
                    'Use this cluster as the default for new operations'
                  )}
                </p>
              </div>
              <Switch
                id="cluster-default"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  handleChange('isDefault', checked)
                }
              />
            </div>
          </div>

          {formData.inCluster && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t(
                  'clusterManagement.form.inCluster.note',
                  'This cluster uses the in-cluster service account configuration. No additional kubeconfig is required.'
                )}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                !formData.name ||
                (!isEditMode && !formData.inCluster && !formData.config &&
                  !(formData.secret_name && formData.secret_namespace && formData.secret_key))
              }
            >
              {isEditMode
                ? t('clusterManagement.actions.save', 'Save Changes')
                : t('clusterManagement.actions.add', 'Add Cluster')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
