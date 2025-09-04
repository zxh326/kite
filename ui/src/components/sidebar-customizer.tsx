import { useMemo, useState } from 'react'
import { useSidebarConfig } from '@/contexts/sidebar-config-context'
import {
  Eye,
  EyeOff,
  PanelLeftOpen,
  Pin,
  PinOff,
  RotateCcw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function SidebarCustomizer() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const {
    config,
    isLoading,
    toggleItemVisibility,
    toggleItemPin,
    toggleGroupCollapse,
    resetConfig,
    getIconComponent,
    toggleGroupVisibility,
  } = useSidebarConfig()

  const pinnedItems = useMemo(() => {
    if (!config) return []
    return config.groups
      .flatMap((group) => group.items)
      .filter((item) => config.pinnedItems.includes(item.id))
  }, [config])

  if (isLoading || !config) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
        >
          <PanelLeftOpen className="h-4 w-4" />
          <span>{t('sidebar.customize', 'Customize Sidebar')}</span>
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="!max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <PanelLeftOpen className="h-5 w-5" />
            {t('sidebar.customizeTitle', 'Customize Sidebar')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 px-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6 pb-6">
            {pinnedItems.length > 0 && (
              <>
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Pin className="h-4 w-4" />
                    {t('sidebar.pinnedItems', 'Pinned Items')} (
                    {pinnedItems.length})
                  </Label>
                  <div className="space-y-2">
                    {pinnedItems.map((item) => {
                      const IconComponent = getIconComponent(item.icon)
                      const title = item.titleKey ? t(item.titleKey) : ''
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 border rounded-md bg-muted/20"
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-sidebar-primary" />
                            <span className="text-sm">{title}</span>
                            <Badge variant="outline" className="text-xs">
                              Pinned
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleItemPin(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-4">
              <Label className="text-sm font-medium">
                {t('sidebar.menuGroups', 'Menu Groups')}
              </Label>

              {config.groups
                .sort((a, b) => a.order - b.order)
                .map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">
                          {group.nameKey ? t(group.nameKey) : ''}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {
                            group.items.filter(
                              (item) => !config.hiddenItems.includes(item.id)
                            ).length
                          }
                          /{group.items.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupCollapse(group.id)}
                          className="h-8 px-2 text-xs"
                        >
                          {group.collapsed ? 'Expand' : 'Collapse'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroupVisibility(group.id)}
                          className="h-8 w-8 p-0"
                          title={group.visible ? 'Hide' : 'Show'}
                        >
                          {!group.visible ? (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div
                      className={`grid gap-2 pl-4 ${group.collapsed ? 'hidden' : ''} ${!group.visible ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {group.items.map((item) => {
                        const IconComponent = getIconComponent(item.icon)
                        const isHidden = config.hiddenItems.includes(item.id)
                        const isPinned = config.pinnedItems.includes(item.id)
                        const title = item.titleKey ? t(item.titleKey) : ''

                        return (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-2 rounded border transition-colors ${
                              isHidden
                                ? 'opacity-50 bg-muted/10'
                                : 'bg-background'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-sidebar-primary" />
                              <span className="text-sm">{title}</span>
                              {isPinned && (
                                <Badge variant="secondary" className="text-xs">
                                  <Pin className="h-3 w-3 mr-1" />
                                  Pinned
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleItemPin(item.id)}
                                className={`h-8 w-8 p-0 ${isPinned ? 'text-primary' : 'text-muted-foreground'}`}
                                title={isPinned ? 'Unpin' : 'Pin to top'}
                              >
                                {isPinned ? (
                                  <PinOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Pin className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleItemVisibility(item.id)}
                                className="h-8 w-8 p-0"
                                title={isHidden ? 'Show' : 'Hide'}
                              >
                                {isHidden ? (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 pt-4 border-t bg-muted/10">
          <Button variant="outline" onClick={resetConfig} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('sidebar.resetToDefault', 'Reset to Default')}
          </Button>
          <Button onClick={() => setOpen(false)}>
            {t('common.done', 'Done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
