import * as React from 'react'
import Icon from '@/assets/icon.svg'
import { CollapsibleContent } from '@radix-ui/react-collapsible'
import {
  IconBell,
  IconBox,
  IconBoxMultiple,
  IconClockHour4,
  IconCode,
  IconDatabase,
  IconFileDatabase,
  IconLayoutDashboard,
  IconLock,
  IconMap,
  IconNetwork,
  IconPlayerPlay,
  IconRocket,
  IconRouter,
  IconServer2,
  IconStack2,
  IconTopologyBus,
} from '@tabler/icons-react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { useCluster } from '@/hooks/use-cluster'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

import { ClusterSelector } from './cluster-selector'
import { Collapsible, CollapsibleTrigger } from './ui/collapsible'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation()
  const location = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const { clusters, isLoading } = useCluster()
  const shouldShowClusterSelector = !isLoading && clusters.length > 1

  const menus = {
    [t('nav.workloads')]: [
      {
        title: t('nav.pods'),
        url: '/pods',
        icon: IconBox,
      },
      {
        title: t('nav.deployments'),
        url: '/deployments',
        icon: IconRocket,
      },
      {
        title: 'StatefulSets',
        url: '/statefulsets',
        icon: IconStack2,
      },
      {
        title: 'DaemonSets',
        url: '/daemonsets',
        icon: IconTopologyBus,
      },
      {
        title: t('nav.jobs'),
        url: '/jobs',
        icon: IconPlayerPlay,
      },
      {
        title: 'CronJobs',
        url: '/cronjobs',
        icon: IconClockHour4,
      },
    ],
    Traffic: [
      {
        title: t('nav.ingresses'),
        url: '/ingresses',
        icon: IconRouter,
      },
      {
        title: t('nav.services'),
        url: '/services',
        icon: IconNetwork,
      },
    ],
    Storage: [
      {
        title: 'PVCs',
        url: '/persistentvolumeclaims',
        icon: IconFileDatabase,
      },
      {
        title: 'PVs',
        url: '/persistentvolumes',
        icon: IconDatabase,
      },
      {
        title: 'Storage Classes',
        url: '/storageclasses',
        icon: IconFileDatabase,
      },
    ],
    Config: [
      {
        title: t('nav.configMaps'),
        url: '/configmaps',
        icon: IconMap,
      },
      {
        title: t('nav.secrets'),
        url: '/secrets',
        icon: IconLock,
      },
    ],
    Other: [
      {
        title: t('nav.namespaces'),
        url: '/namespaces',
        icon: IconBoxMultiple,
      },
      {
        title: t('nav.nodes'),
        url: '/nodes',
        icon: IconServer2,
      },
      {
        title: 'Events',
        url: '/events',
        icon: IconBell,
      },
      {
        title: 'CRDs',
        url: '/crds',
        icon: IconCode,
      },
    ],
  }

  // Function to check if current path matches menu item
  const isActive = (url: string) => {
    if (url === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(url)
  }

  // Handle menu item click on mobile - close sidebar
  const handleMenuItemClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/" onClick={handleMenuItemClick}>
                <img src={Icon} alt="Kite Logo" className="ml-1 h-8 w-8" />
                <span className="text-base font-semibold">Kite</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t('nav.overview')}
                asChild
                isActive={isActive('/')}
              >
                <Link to="/" onClick={handleMenuItemClick}>
                  <IconLayoutDashboard className="text-sidebar-primary" />
                  <span className="font-medium">{t('nav.overview')}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {Object.entries(menus).map(([group, items]) => (
          <Collapsible defaultOpen className="group/collapsible" key={group}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  {group}
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent className="flex flex-col gap-2">
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          asChild
                          isActive={isActive(item.url)}
                        >
                          <Link to={item.url} onClick={handleMenuItemClick}>
                            {item.icon && (
                              <item.icon className="text-sidebar-primary" />
                            )}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
      {shouldShowClusterSelector && (
        <SidebarFooter>
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-muted/60 border border-border/80">
            <ClusterSelector />
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
