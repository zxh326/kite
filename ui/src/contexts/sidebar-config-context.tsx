/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import * as React from 'react'
import {
  Icon,
  IconArrowsHorizontal,
  IconBell,
  IconBox,
  IconBoxMultiple,
  IconClockHour4,
  IconCode,
  IconDatabase,
  IconFileDatabase,
  IconKey,
  IconLoadBalancer,
  IconLock,
  IconMap,
  IconNetwork,
  IconPlayerPlay,
  IconProps,
  IconRocket,
  IconRoute,
  IconRouter,
  IconServer2,
  IconShield,
  IconShieldCheck,
  IconStack2,
  IconTopologyBus,
  IconUser,
  IconUsers,
} from '@tabler/icons-react'

import {
  DefaultMenus,
  SidebarConfig,
  SidebarGroup,
  SidebarItem,
} from '@/types/sidebar'
import { withSubPath } from '@/lib/subpath'

import { useAuth } from './auth-context'

const iconMap = {
  IconBox,
  IconRocket,
  IconStack2,
  IconTopologyBus,
  IconPlayerPlay,
  IconClockHour4,
  IconRouter,
  IconNetwork,
  IconLoadBalancer,
  IconRoute,
  IconFileDatabase,
  IconDatabase,
  IconMap,
  IconLock,
  IconUser,
  IconShield,
  IconUsers,
  IconShieldCheck,
  IconKey,
  IconBoxMultiple,
  IconServer2,
  IconBell,
  IconCode,
  IconArrowsHorizontal,
}

const getIconName = (iconComponent: React.ComponentType): string => {
  const entry = Object.entries(iconMap).find(
    ([, component]) => component === iconComponent
  )
  return entry ? entry[0] : 'IconBox'
}

interface SidebarConfigContextType {
  config: SidebarConfig | null
  isLoading: boolean
  hasUpdate: boolean
  updateConfig: (updates: Partial<SidebarConfig>) => void
  toggleItemVisibility: (itemId: string) => void
  toggleGroupVisibility: (groupId: string) => void
  toggleItemPin: (itemId: string) => void
  toggleGroupCollapse: (groupId: string) => void
  resetConfig: () => void
  getIconComponent: (
    iconName: string
  ) =>
    | React.ForwardRefExoticComponent<IconProps & React.RefAttributes<Icon>>
    | React.ElementType
  createCustomGroup: (groupName: string) => void
  addCRDToGroup: (groupId: string, crdName: string, kind: string) => void
  removeCRDToGroup: (groupId: string, crdName: string) => void
  removeCustomGroup: (groupId: string) => void
  moveGroup: (groupId: string, direction: 'up' | 'down') => void
}

const SidebarConfigContext = createContext<
  SidebarConfigContextType | undefined
>(undefined)

export const useSidebarConfig = () => {
  const context = useContext(SidebarConfigContext)
  if (!context) {
    throw new Error(
      'useSidebarConfig must be used within a SidebarConfigProvider'
    )
  }
  return context
}

interface SidebarConfigProviderProps {
  children: React.ReactNode
}

const defaultMenus: DefaultMenus = {
  'sidebar.groups.workloads': [
    { titleKey: 'nav.pods', url: '/pods', icon: IconBox },
    { titleKey: 'nav.deployments', url: '/deployments', icon: IconRocket },
    {
      titleKey: 'nav.statefulsets',
      url: '/statefulsets',
      icon: IconStack2,
    },
    {
      titleKey: 'nav.daemonsets',
      url: '/daemonsets',
      icon: IconTopologyBus,
    },
    { titleKey: 'nav.jobs', url: '/jobs', icon: IconPlayerPlay },
    { titleKey: 'nav.cronjobs', url: '/cronjobs', icon: IconClockHour4 },
  ],
  'sidebar.groups.traffic': [
    { titleKey: 'nav.ingresses', url: '/ingresses', icon: IconRouter },
    { titleKey: 'nav.networkpolicies', url: '/networkpolicies', icon: IconShield },
    { titleKey: 'nav.services', url: '/services', icon: IconNetwork },
    { titleKey: 'nav.gateways', url: '/gateways', icon: IconLoadBalancer },
    { titleKey: 'nav.httproutes', url: '/httproutes', icon: IconRoute },
  ],
  'sidebar.groups.storage': [
    {
      titleKey: 'sidebar.short.pvcs',
      url: '/persistentvolumeclaims',
      icon: IconFileDatabase,
    },
    {
      titleKey: 'sidebar.short.pvs',
      url: '/persistentvolumes',
      icon: IconDatabase,
    },
    {
      titleKey: 'nav.storageclasses',
      url: '/storageclasses',
      icon: IconFileDatabase,
    },
  ],
  'sidebar.groups.config': [
    { titleKey: 'nav.configMaps', url: '/configmaps', icon: IconMap },
    { titleKey: 'nav.secrets', url: '/secrets', icon: IconLock },
    {
      titleKey: 'nav.horizontalpodautoscalers',
      url: '/horizontalpodautoscalers',
      icon: IconArrowsHorizontal,
    },
  ],
  'sidebar.groups.security': [
    {
      titleKey: 'nav.serviceaccounts',
      url: '/serviceaccounts',
      icon: IconUser,
    },
    { titleKey: 'nav.roles', url: '/roles', icon: IconShield },
    { titleKey: 'nav.rolebindings', url: '/rolebindings', icon: IconUsers },
    {
      titleKey: 'nav.clusterroles',
      url: '/clusterroles',
      icon: IconShieldCheck,
    },
    {
      titleKey: 'nav.clusterrolebindings',
      url: '/clusterrolebindings',
      icon: IconKey,
    },
  ],
  'sidebar.groups.other': [
    {
      titleKey: 'nav.namespaces',
      url: '/namespaces',
      icon: IconBoxMultiple,
    },
    { titleKey: 'nav.nodes', url: '/nodes', icon: IconServer2 },
    { titleKey: 'nav.events', url: '/events', icon: IconBell },
    { titleKey: 'nav.crds', url: '/crds', icon: IconCode },
  ],
}

const CURRENT_CONFIG_VERSION = 1

const defaultConfigs = (): SidebarConfig => {
  const groups: SidebarGroup[] = []
  let groupOrder = 0

  Object.entries(defaultMenus).forEach(([groupKey, items]) => {
    const groupId = groupKey
      .toLowerCase()
      .replace(/\./g, '-')
      .replace(/\s+/g, '-')
    const sidebarItems: SidebarItem[] = items.map((item, index) => ({
      id: `${groupId}-${item.url.replace(/[^a-zA-Z0-9]/g, '-')}`,
      titleKey: item.titleKey,
      url: item.url,
      icon: getIconName(item.icon),
      visible: true,
      pinned: false,
      order: index,
    }))

    groups.push({
      id: groupId,
      nameKey: groupKey,
      items: sidebarItems,
      visible: true,
      collapsed: false,
      order: groupOrder++,
    })
  })

  return {
    version: CURRENT_CONFIG_VERSION,
    groups,
    hiddenItems: [],
    pinnedItems: [],
    groupOrder: groups.map((g) => g.id),
    lastUpdated: Date.now(),
  }
}

export const SidebarConfigProvider: React.FC<SidebarConfigProviderProps> = ({
  children,
}) => {
  const [config, setConfig] = useState<SidebarConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasUpdate, setHasUpdate] = useState(false)
  const { user } = useAuth()

  const loadConfig = useCallback(async () => {
    if (user && user.sidebar_preference && user.sidebar_preference != '') {
      const userConfig = JSON.parse(user.sidebar_preference)
      setConfig(userConfig)

      const currentVersion = userConfig.version || 0
      if (currentVersion < CURRENT_CONFIG_VERSION) {
        setHasUpdate(true)
      }
      return
    }
    setConfig(defaultConfigs())
  }, [user])

  const saveConfig = useCallback(
    async (newConfig: SidebarConfig) => {
      if (!user) {
        setConfig(newConfig)
        return
      }

      try {
        const configToSave = {
          ...newConfig,
          lastUpdated: Date.now(),
          version: CURRENT_CONFIG_VERSION,
        }

        const response = await fetch(
          withSubPath('/api/users/sidebar_preference'),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              sidebar_preference: JSON.stringify(configToSave),
            }),
          }
        )

        if (response.ok) {
          setConfig(configToSave)
        } else {
          console.error('Failed to save sidebar config to server')
        }
      } catch (error) {
        console.error('Failed to save sidebar config to server:', error)
      }
    },
    [user]
  )

  const updateConfig = useCallback(
    (updates: Partial<SidebarConfig>) => {
      if (!config) return
      const newConfig = { ...config, ...updates }
      saveConfig(newConfig)
    },
    [config, saveConfig]
  )

  const toggleItemVisibility = useCallback(
    (itemId: string) => {
      if (!config) return

      const hiddenItems = new Set(config.hiddenItems)
      if (hiddenItems.has(itemId)) {
        hiddenItems.delete(itemId)
      } else {
        hiddenItems.add(itemId)
      }

      updateConfig({ hiddenItems: Array.from(hiddenItems) })
    },
    [config, updateConfig]
  )

  const toggleItemPin = useCallback(
    (itemId: string) => {
      if (!config) return

      const pinnedItems = new Set(config.pinnedItems)
      if (pinnedItems.has(itemId)) {
        pinnedItems.delete(itemId)
      } else {
        pinnedItems.add(itemId)
      }

      updateConfig({ pinnedItems: Array.from(pinnedItems) })
    },
    [config, updateConfig]
  )

  const toggleGroupVisibility = useCallback(
    (groupId: string) => {
      if (!config) return

      const groups = config.groups.map((group) =>
        group.id === groupId ? { ...group, visible: !group.visible } : group
      )

      updateConfig({ groups })
    },
    [config, updateConfig]
  )

  const toggleGroupCollapse = useCallback(
    (groupId: string) => {
      if (!config) return

      const groups = config.groups.map((group) =>
        group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
      )

      updateConfig({ groups })
    },
    [config, updateConfig]
  )

  const moveGroup = useCallback(
    (groupId: string, direction: 'up' | 'down') => {
      if (!config) return

      const sortedGroups = [...config.groups].sort((a, b) => a.order - b.order)
      const currentIndex = sortedGroups.findIndex(
        (group) => group.id === groupId
      )
      if (currentIndex === -1) return

      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex < 0 || targetIndex >= sortedGroups.length) {
        return
      }

      const reordered = [...sortedGroups]
      const [movedGroup] = reordered.splice(currentIndex, 1)
      reordered.splice(targetIndex, 0, movedGroup)

      const groups = reordered.map((group, index) => ({
        ...group,
        order: index,
      }))
      const groupOrder = groups.map((group) => group.id)

      updateConfig({ groups, groupOrder })
    },
    [config, updateConfig]
  )

  const createCustomGroup = useCallback(
    (groupName: string) => {
      if (!config) return

      const groupId = `custom-${groupName.toLowerCase().replace(/\s+/g, '-')}`

      // Check if group already exists
      if (config.groups.find((g) => g.id === groupId)) {
        return
      }

      const newGroup: SidebarGroup = {
        id: groupId,
        nameKey: groupName,
        items: [],
        visible: true,
        collapsed: false,
        order: config.groups.length,
        isCustom: true,
      }

      const groups = [...config.groups, newGroup]
      updateConfig({ groups, groupOrder: [...config.groupOrder, groupId] })
    },
    [config, updateConfig]
  )

  const addCRDToGroup = useCallback(
    (groupId: string, crdName: string, kind: string) => {
      if (!config) return

      const groups = config.groups.map((group) => {
        if (group.id === groupId) {
          const itemId = `${groupId}-${crdName.replace(/[^a-zA-Z0-9]/g, '-')}`

          // Check if CRD already exists in this group
          if (group.items.find((item) => item.id === itemId)) {
            return group
          }

          const newItem: SidebarItem = {
            id: itemId,
            titleKey: kind,
            url: `/crds/${crdName}`,
            icon: 'IconCode',
            visible: true,
            pinned: false,
            order: group.items.length,
          }

          return {
            ...group,
            items: [...group.items, newItem],
          }
        }
        return group
      })

      updateConfig({ groups })
    },
    [config, updateConfig]
  )

  const removeCRDToGroup = useCallback(
    (groupId: string, itemID: string) => {
      if (!config) return
      const groups = config.groups.map((group) => {
        if (group.id === groupId) {
          const newItems = group.items.filter((item) => item.id !== itemID)
          return {
            ...group,
            items: newItems,
          }
        }
        return group
      })

      const pinnedItems = config.pinnedItems.filter((item) => item !== itemID)
      const hiddenItems = config.hiddenItems.filter((item) => item !== itemID)

      updateConfig({ groups, pinnedItems, hiddenItems })
    },
    [config, updateConfig]
  )

  const removeCustomGroup = useCallback(
    (groupId: string) => {
      if (!config) return

      // Only allow removing custom groups
      const group = config.groups.find((g) => g.id === groupId)
      if (!group?.isCustom) return

      const groups = config.groups.filter((g) => g.id !== groupId)
      const groupOrder = config.groupOrder.filter((id) => id !== groupId)

      // Remove any pinned items from this group
      const groupItemIds = group.items.map((item) => item.id)
      const pinnedItems = config.pinnedItems.filter(
        (itemId) => !groupItemIds.includes(itemId)
      )
      const hiddenItems = config.hiddenItems.filter(
        (itemId) => !groupItemIds.includes(itemId)
      )

      updateConfig({ groups, groupOrder, pinnedItems, hiddenItems })
    },
    [config, updateConfig]
  )

  const resetConfig = useCallback(() => {
    const newConfig = defaultConfigs()
    saveConfig(newConfig)
    setHasUpdate(false)
  }, [saveConfig])

  const getIconComponent = useCallback((iconName: string) => {
    return iconMap[iconName as keyof typeof iconMap] || IconBox
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await loadConfig()
      setIsLoading(false)
    }
    loadData()
  }, [loadConfig])

  const value: SidebarConfigContextType = {
    config,
    isLoading,
    hasUpdate,
    updateConfig,
    toggleItemVisibility,
    toggleGroupVisibility,
    toggleItemPin,
    toggleGroupCollapse,
    resetConfig,
    getIconComponent,
    createCustomGroup,
    addCRDToGroup,
    removeCRDToGroup,
    removeCustomGroup,
    moveGroup,
  }

  return (
    <SidebarConfigContext.Provider value={value}>
      {children}
    </SidebarConfigContext.Provider>
  )
}
