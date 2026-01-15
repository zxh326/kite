import { useState } from 'react'
import { Namespace } from 'kubernetes-types/core/v1'
import { X } from 'lucide-react'

import { useResources } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function NamespaceSelector({
  selectedNamespace,
  selectedNamespaces,
  handleNamespaceChange,
  handleNamespacesChange,
  showAll = false,
  multiSelect = false,
}: {
  selectedNamespace?: string
  selectedNamespaces?: string[]
  handleNamespaceChange?: (namespace: string) => void
  handleNamespacesChange?: (namespaces: string[]) => void
  showAll?: boolean
  multiSelect?: boolean
}) {
  const { data, isLoading } = useResources('namespaces')
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const sortedNamespaces = data?.sort((a, b) => {
    const nameA = a.metadata?.name?.toLowerCase() || ''
    const nameB = b.metadata?.name?.toLowerCase() || ''
    return nameA.localeCompare(nameB)
  }) || [{ metadata: { name: 'default' } }]

  const filteredNamespaces = sortedNamespaces.filter((ns) => {
    const name = ns.metadata?.name?.toLowerCase() || ''
    return name.includes(searchTerm.toLowerCase())
  })

  const isMultiSelect = multiSelect || handleNamespacesChange !== undefined
  const currentSelected = isMultiSelect 
    ? (selectedNamespaces || [])
    : (selectedNamespace ? [selectedNamespace] : [])
  
  const selectedSet = new Set(currentSelected)
  const allSelected = showAll && selectedSet.has('_all')

  const handleToggleNamespace = (namespace: string) => {
    if (!isMultiSelect && handleNamespaceChange) {
      handleNamespaceChange(namespace === '_all' ? '' : namespace)
      setOpen(false)
      return
    }

    if (!handleNamespacesChange) return
    
    const newSelected = new Set(currentSelected)
    
    if (namespace === '_all') {
      if (allSelected) {
        newSelected.clear()
      } else {
        newSelected.clear()
        newSelected.add('_all')
      }
    } else {
      newSelected.delete('_all')
      if (newSelected.has(namespace)) {
        newSelected.delete(namespace)
      } else {
        newSelected.add(namespace)
      }
    }
    
    handleNamespacesChange(Array.from(newSelected))
  }

  const handleRemoveNamespace = (namespace: string) => {
    if (!isMultiSelect || !handleNamespacesChange) return
    const newSelected = new Set(currentSelected)
    newSelected.delete(namespace)
    handleNamespacesChange(Array.from(newSelected))
  }

  const displayText = () => {
    if (!isMultiSelect) {
      if (selectedNamespace === '_all') {
        return 'All Namespaces'
      }
      return selectedNamespace || 'Select a namespace'
    }
    
    if (allSelected) {
      return 'All Namespaces'
    }
    if (currentSelected.length > 0) {
      if (currentSelected.length === 1) {
        return currentSelected[0]
      }
      return `${currentSelected.length} namespaces`
    }
    return 'Select namespaces'
  }

  if (!isMultiSelect && handleNamespaceChange) {
    return (
      <Select value={selectedNamespace} onValueChange={handleNamespaceChange}>
        <SelectTrigger className="max-w-48">
          <SelectValue placeholder="Select a namespace" />
        </SelectTrigger>
        <SelectContent>
          {isLoading && (
            <SelectItem disabled value="_loading">
              Loading namespaces...
            </SelectItem>
          )}
          {showAll && (
            <SelectItem key="all" value="_all">
              All Namespaces
            </SelectItem>
          )}
          {sortedNamespaces?.map((ns: Namespace) => (
            <SelectItem key={ns.metadata!.name} value={ns.metadata!.name!}>
              {ns.metadata!.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="max-w-64 justify-start text-left font-normal"
        >
          <span className="truncate">{displayText()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="Search namespaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-64 overflow-auto p-2">
          {isLoading && (
            <div className="p-2 text-sm text-muted-foreground">
              Loading namespaces...
            </div>
          )}
          {showAll && (
            <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => handleToggleNamespace('_all')}
                id="namespace-all"
              />
              <label
                htmlFor="namespace-all"
                className="flex-1 text-sm font-medium cursor-pointer"
              >
                All Namespaces
              </label>
            </div>
          )}
          {filteredNamespaces.map((ns: Namespace) => {
            const name = ns.metadata!.name!
            const isSelected = selectedSet.has(name)
            return (
              <div
                key={name}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                onClick={() => handleToggleNamespace(name)}
              >
                {isMultiSelect ? (
                  <>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleNamespace(name)}
                      id={`namespace-${name}`}
                    />
                    <label
                      htmlFor={`namespace-${name}`}
                      className="flex-1 text-sm font-medium cursor-pointer"
                    >
                      {name}
                    </label>
                  </>
                ) : (
                  <span className="flex-1 text-sm font-medium">{name}</span>
                )}
              </div>
            )
          })}
          {!isLoading && filteredNamespaces.length === 0 && (
            <div className="p-2 text-sm text-muted-foreground">
              No namespaces found
            </div>
          )}
        </div>
        {isMultiSelect && currentSelected.length > 0 && !allSelected && (
          <div className="p-3 border-t">
            <div className="flex flex-wrap gap-2">
              {currentSelected.map((ns) => (
                <Badge
                  key={ns}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {ns}
                  <button
                    onClick={() => handleRemoveNamespace(ns)}
                    className="ml-1 hover:bg-accent rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
