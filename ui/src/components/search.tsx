import { Search as SearchIcon } from 'lucide-react'

import { useGlobalSearch } from './global-search-provider'
import { Button } from './ui/button'

export function Search() {
  const { openSearch } = useGlobalSearch()

  return (
    <Button
      variant="outline"
      className="flex items-center gap-2 px-3 py-2 h-9 w-64 justify-start text-muted-foreground border-border/50"
      onClick={openSearch}
    >
      <SearchIcon className="h-4 w-4" />
      <span className="flex-1 text-left">Search resources...</span>
      <div className="flex items-center gap-1 text-xs">
        <kbd className="bg-background text-muted-foreground pointer-events-none flex h-5 items-center justify-center gap-1 rounded border px-1 font-sans text-[0.7rem] font-medium select-none [_svg:not([class*='size-'])]:size-3">
          ⌘
        </kbd>
        <kbd className="bg-background text-muted-foreground pointer-events-none flex h-5 items-center justify-center gap-1 rounded border px-1 font-sans text-[0.7rem] font-medium select-none [&_svg:not([class*='size-'])]:size-3 aspect-square">
          K
        </kbd>
      </div>
    </Button>
  )
}
