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
  IconKey,
  IconLayoutDashboard,
  IconLoadBalancer,
  IconLock,
  IconMap,
  IconNetwork,
  IconPlayerPlay,
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
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

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
        title: t('nav.statefulsets'),
        url: '/statefulsets',
        icon: IconStack2,
      },
      {
        title: t('nav.daemonsets'),
        url: '/daemonsets',
        icon: IconTopologyBus,
      },
      {
        title: t('nav.jobs'),
        url: '/jobs',
        icon: IconPlayerPlay,
      },
      {
        title: t('nav.cronjobs'),
        url: '/cronjobs',
        icon: IconClockHour4,
      },
    ],
    [t('sidebar.groups.traffic')]: [
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
      {
        title: t('nav.gateways'),
        url: '/gateways',
        icon: IconLoadBalancer,
      },
      {
        title: t('nav.httproutes'),
        url: '/httproutes',
        icon: IconRoute,
      },
    ],
    [t('sidebar.groups.storage')]: [
      {
        title: t('sidebar.short.pvcs'),
        url: '/persistentvolumeclaims',
        icon: IconFileDatabase,
      },
      {
        title: t('sidebar.short.pvs'),
        url: '/persistentvolumes',
        icon: IconDatabase,
      },
      {
        title: t('nav.storageclasses'),
        url: '/storageclasses',
        icon: IconFileDatabase,
      },
    ],
    [t('sidebar.groups.config')]: [
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
    [t('sidebar.groups.security')]: [
      {
        title: t('nav.serviceaccounts'),
        url: '/serviceaccounts',
        icon: IconUser,
      },
      {
        title: t('nav.roles'),
        url: '/roles',
        icon: IconShield,
      },
      {
        title: t('nav.rolebindings'),
        url: '/rolebindings',
        icon: IconUsers,
      },
      {
        title: t('nav.clusterroles'),
        url: '/clusterroles',
        icon: IconShieldCheck,
      },
      {
        title: t('nav.clusterrolebindings'),
        url: '/clusterrolebindings',
        icon: IconKey,
      },
    ],
    [t('sidebar.groups.other')]: [
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
        title: t('nav.events'),
        url: '/events',
        icon: IconBell,
      },
      {
        title: t('nav.crds'),
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
              className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-accent/50 transition-colors"
            >
              <Link to="/" onClick={handleMenuItemClick}>
                <img src={Icon} alt="Kite Logo" className="ml-1 h-8 w-8" />
                <span className="text-base font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Kite
                </span>
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
                className="transition-all duration-200 hover:bg-accent/60 active:scale-95 data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-sm"
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
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors group-data-[state=open]:text-foreground">
                  <span className="uppercase tracking-wide text-xs font-bold">
                    {group}
                  </span>
                  <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
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

      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-gradient-to-r from-muted/40 to-muted/20 border border-border/60 backdrop-blur-sm">
          <ClusterSelector />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
