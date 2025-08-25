import { useTranslation } from 'react-i18next'

import { ResponsiveTabs } from '@/components/ui/responsive-tabs'
import { ClusterManagement } from '@/components/settings/cluster-management'
import { OAuthProviderManagement } from '@/components/settings/oauth-provider-management'
import { RBACManagement } from '@/components/settings/rbac-management'

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
            label: t('settings.tabs.clusters', 'Cluster'),
            content: <ClusterManagement />,
          },
          {
            value: 'oauth',
            label: t('settings.tabs.oauth', 'OAuth'),
            content: <OAuthProviderManagement />,
          },
          {
            value: 'rbac',
            label: t('settings.tabs.rbac', 'RBAC'),
            content: <RBACManagement />,
          },
          {
            value: 'users',
            label: t('settings.tabs.users', 'User'),
            content: <div />,
          },
        ]}
      />
    </div>
  )
}
