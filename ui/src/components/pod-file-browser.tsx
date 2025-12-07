import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconArrowUp,
  IconDownload,
  IconFile,
  IconFolder,
  IconHome,
  IconLoader,
  IconRefresh,
  IconUpload,
} from '@tabler/icons-react'
import { Container } from 'kubernetes-types/core/v1'
import { toast } from 'sonner'

import {
  FileInfo,
  podDownloadFile,
  podListFiles,
  podUploadFile,
} from '@/lib/api'
import { formatBytes } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface PodFileBrowserProps {
  namespace: string
  podName: string
  containers?: Container[]
  initContainers?: Container[]
}

export function PodFileBrowser({
  namespace,
  podName,
  containers = [],
  initContainers = [],
}: PodFileBrowserProps) {
  const allContainers = [
    ...containers.map((c) => ({ ...c, type: 'container' })),
    ...initContainers.map((c) => ({ ...c, type: 'init-container' })),
  ]

  const [selectedContainer, setSelectedContainer] = useState<string>(
    allContainers[0]?.name || ''
  )
  const [currentPath, setCurrentPath] = useState<string>('/')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [fileCache, setFileCache] = useState<Record<string, FileInfo[]>>({})

  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchFiles = useCallback(
    async (path: string, force = false) => {
      if (!selectedContainer) return

      const cacheKey = `${selectedContainer}:${path}`

      // Check cache first
      if (!force && fileCache[cacheKey]) {
        setFiles(fileCache[cacheKey])
        return
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setIsLoading(true)
      try {
        const data = await podListFiles(
          namespace,
          podName,
          selectedContainer,
          path,
          {
            signal: abortController.signal,
          }
        )
        // Sort: directories first, then files
        data.sort((a, b) => {
          if (a.isDir === b.isDir) {
            return a.name.localeCompare(b.name)
          }
          return a.isDir ? -1 : 1
        })
        setFiles(data)
        setFileCache((prev) => ({ ...prev, [cacheKey]: data }))
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        const message =
          error instanceof Error ? error.message : 'Failed to list files'
        toast.error(message)
        setFiles([])
        console.error(error)
      } finally {
        if (abortControllerRef.current === abortController) {
          setIsLoading(false)
          abortControllerRef.current = null
        }
      }
    },
    [selectedContainer, fileCache, namespace, podName]
  )

  useEffect(() => {
    fetchFiles(currentPath)
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchFiles, currentPath])

  const handleNavigate = (path: string) => {
    // Normalize path
    if (!path.startsWith('/')) {
      path = '/' + path
    }
    setCurrentPath(path)
  }

  const handleEnterDirectory = (dirName: string) => {
    const newPath =
      currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`
    handleNavigate(newPath)
  }

  const handleGoUp = () => {
    if (currentPath === '/') return
    const parts = currentPath.split('/')
    parts.pop()
    const newPath = parts.join('/') || '/'
    handleNavigate(newPath)
  }

  const handleDownload = (fileName: string) => {
    const filePath =
      currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`
    podDownloadFile(namespace, podName, selectedContainer, filePath)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await podUploadFile(
        namespace,
        podName,
        selectedContainer,
        currentPath,
        file
      )
      toast.success(`Uploaded ${file.name} successfully`)
      fetchFiles(currentPath, true)
    } catch (error) {
      toast.error('Failed to upload file')
      console.error(error)
    } finally {
      setIsUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-[200px]">
          <Select
            value={selectedContainer}
            onValueChange={setSelectedContainer}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select container" />
            </SelectTrigger>
            <SelectContent>
              {allContainers.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleGoUp}
            disabled={currentPath === '/'}
          >
            <IconArrowUp className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleNavigate('/')}
            disabled={currentPath === '/'}
          >
            <IconHome className="w-4 h-4" />
          </Button>
          <Input
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetchFiles(currentPath)
              }
            }}
            className="font-mono"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchFiles(currentPath, true)}
          >
            <IconRefresh className="w-4 h-4" />
          </Button>
        </div>
        <div>
          <Input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <Label
            htmlFor="file-upload"
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <IconLoader className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <IconUpload className="w-4 h-4 mr-2" />
            )}
            Upload
          </Label>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Size</TableHead>
              <TableHead className="w-[150px]">Mode</TableHead>
              <TableHead className="w-[200px]">Modified</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <IconLoader className="animate-spin" />
                    <span>Loading files...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No files found
                </TableCell>
              </TableRow>
            ) : (
              files &&
              Array.isArray(files) &&
              files.map((file) => (
                <TableRow key={file.name}>
                  <TableCell>
                    {file.isDir ? (
                      <IconFolder className="w-4 h-4 text-blue-500" />
                    ) : (
                      <IconFile className="w-4 h-4 text-gray-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    {file.isDir ? (
                      <button
                        className="font-medium hover:underline text-left"
                        onClick={() => handleEnterDirectory(file.name)}
                      >
                        {file.name}
                      </button>
                    ) : (
                      <span>{file.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {file.isDir ? '-' : formatBytes(file.size)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {file.mode}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {file.modTime}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                    >
                      <IconDownload className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
