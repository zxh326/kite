import { useTranslation } from 'react-i18next'

import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { ClusterManagement } from '@/components/settings/cluster-management'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl">{t('settings.title', 'Settings')}</h1>
        </div>
        <p className="text-muted-foreground">
          {t('settings.description', 'Manage clusters, roles and permissions')}
        </p>
      </div>

      <ResponsiveTabs
        tabs={[
          {
            value: 'clusters',
            label: t('settings.tabs.clusters', 'Cluster Management'),
            content: <ClusterManagement />,
          },
          {
            value: 'auth',
            label: t('settings.tabs.auth', 'Authentication'),
            content: <div />,
          },
          {
            value: 'rbac',
            label: t('settings.tabs.rbac', 'Access Control'),
            content: <div />,
          },
          {
            value: 'users',
            label: t('settings.tabs.users', 'User Management'),
            content: <div />,
          },
        ]}
      />
    </div>
  )
}
