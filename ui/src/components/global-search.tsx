import { useCallback, useEffect, useState } from 'react'
import {
  IconArrowsHorizontal,
  IconBox,
  IconBoxMultiple,
  IconLoadBalancer,
  IconLoader,
  IconLock,
  IconMap,
  IconNetwork,
  IconPlayerPlay,
  IconRocket,
  IconRoute,
  IconRouter,
  IconServer2,
  IconStar,
  IconStarFilled,
  IconTopologyBus,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { globalSearch, SearchResult } from '@/lib/api'
import { useFavorites } from '@/hooks/use-favorites'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Define resource types and their display properties
const RESOURCE_CONFIG: Record<
  string,
  {
    label: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  pods: { label: 'nav.pods', icon: IconBox },
  deployments: { label: 'nav.deployments', icon: IconRocket },
  services: { label: 'nav.services', icon: IconNetwork },
  configmaps: { label: 'nav.configMaps', icon: IconMap },
  secrets: { label: 'nav.secrets', icon: IconLock },
  namespaces: {
    label: 'nav.namespaces',
    icon: IconBoxMultiple,
  },
  nodes: { label: 'nav.nodes', icon: IconServer2 },
  jobs: { label: 'nav.jobs', icon: IconPlayerPlay },
  ingresses: { label: 'nav.ingresses', icon: IconRouter },
  gateways: { label: 'nav.gateways', icon: IconLoadBalancer },
  httproutes: { label: 'nav.httproutes', icon: IconRoute },
  daemonsets: {
    label: 'nav.daemonsets',
    icon: IconTopologyBus,
  },
  horizontalpodautoscalers: {
    label: 'nav.horizontalpodautoscalers',
    icon: IconArrowsHorizontal,
  },
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>([])
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // Use favorites hook
  const {
    favorites,
    isFavorite,
    toggleFavorite: toggleResourceFavorite,
  } = useFavorites()

  // Handle favorite toggle
  const toggleFavorite = useCallback(
    (result: SearchResult, event: React.MouseEvent) => {
      event.stopPropagation() // Prevent item selection

      toggleResourceFavorite(result)

      // Refresh results to update favorite status if showing favorites
      const currentQuery = query
      setTimeout(() => {
        if (!currentQuery || currentQuery.length < 2) {
          setResults(favorites)
        }
      }, 0)
    },
    [query, toggleResourceFavorite, favorites]
  )

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    try {
      setIsLoading(true)
      const response = await globalSearch(searchQuery, { limit: 10 })
      setResults(response.results)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce search calls
  useEffect(() => {
    if (query.length > 0) {
      setResults(null)
    }
    if (!query || query.length < 2) {
      if (query.length === 0) {
        setResults(favorites)
      }
      return
    }
    setIsLoading(true)
    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, performSearch, favorites])

  // Handle item selection
  const handleSelect = useCallback(
    (path: string) => {
      navigate(path)
      onOpenChange(false)
      setQuery('')
    },
    [navigate, onOpenChange]
  )

  // Clear state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setIsLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (open && query === '') {
      setResults(favorites) // Show favorites when dialog opens
    }
  }, [open, query, favorites])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>{t('globalSearch.title')}</DialogTitle>
        <DialogDescription>{t('globalSearch.description')}</DialogDescription>
      </DialogHeader>
      <DialogContent className="overflow-hidden p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('globalSearch.placeholder')}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <IconLoader className="h-4 w-4 animate-spin" />
                  <span>{t('globalSearch.searching')}</span>
                </div>
              ) : query.length < 2 ? (
                t('globalSearch.emptyHint')
              ) : (
                t('globalSearch.noResults')
              )}
            </CommandEmpty>

            {results && results.length > 0 && (
              <CommandGroup
                heading={
                  query.length < 2
                    ? t('globalSearch.favorites')
                    : t('globalSearch.resources')
                }
              >
                {results.map((result) => {
                  const config = RESOURCE_CONFIG[result.resourceType] || {
                    label: result.resourceType,
                    icon: IconBox, // Default icon if not found
                  }
                  const Icon = config.icon
                  const isFav = isFavorite(result.id)
                  const path = result.namespace
                    ? `/${result.resourceType}/${result.namespace}/${result.name}`
                    : `/${result.resourceType}/${result.name}`
                  return (
                    <CommandItem
                      key={result.id}
                      value={`${result.name} ${result.namespace || ''} ${result.resourceType} ${
                        RESOURCE_CONFIG[result.resourceType]?.label ||
                        result.resourceType
                      }`}
                      onSelect={() => handleSelect(path)}
                      className="flex items-center gap-3 py-3"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.name}</span>
                          <Badge className="text-xs">
                            {RESOURCE_CONFIG[result.resourceType]?.label
                              ? t(
                                  RESOURCE_CONFIG[result.resourceType]
                                    .label as string
                                )
                              : result.resourceType}
                          </Badge>
                        </div>
                        {result.namespace && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Namespace: {result.namespace}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(result, e)
                        }}
                        className="p-1 hover:bg-accent rounded transition-colors z-10 relative"
                      >
                        {isFav ? (
                          <IconStarFilled className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <IconStar className="h-3 w-3 text-muted-foreground opacity-50" />
                        )}
                      </button>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
