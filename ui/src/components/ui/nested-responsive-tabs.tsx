import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useState } from 'react'

interface TabItem {
  value: string
  label: React.ReactNode
  content: React.ReactNode
}

interface NestedResponsiveTabsProps {
  tabs: TabItem[]
  className?: string
  tabsListClassName?: string
}

export function NestedResponsiveTabs({
  tabs,
  className,
  tabsListClassName,
}: NestedResponsiveTabsProps) {
  const isMobile = useIsMobile()
  const [value, onValueChange] = useState(tabs[0]?.value || '')

  const currentTab = tabs.find((tab) => tab.value === value)

  if (isMobile) {
    return (
      <div className={cn('space-y-4', className)}>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full">
            <SelectValue>{currentTab?.label || 'Select tab'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentTab && <div className="space-y-4">{currentTab.content}</div>}
      </div>
    )
  }

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList
        className={cn(
          '**:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1',
          tabsListClassName
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="space-y-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}