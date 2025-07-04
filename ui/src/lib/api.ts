// API service for Kubernetes resources

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  clusterScopeResources,
  DeploymentRelatedResource,
  ImageTagInfo,
  OverviewData,
  PodMetrics,
  ResourcesTypeMap,
  ResourceType,
  ResourceTypeMap,
  ResourceUsageHistory,
} from '@/types/api'

import { API_BASE_URL, apiClient } from './api-client'

type ResourcesItems<T extends ResourceType> = ResourcesTypeMap[T]['items']

// Pagination result type
export interface PaginatedResult<T> {
  items: T
  pagination: {
    hasNextPage: boolean
    nextContinueToken?: string
    remainingItems?: number
  }
}

// Generic fetch function with error handling
async function fetchAPI<T>(endpoint: string): Promise<T> {
  try {
    return await apiClient.get<T>(`${endpoint}`)
  } catch (error: unknown) {
    console.error('API request failed:', error)
    throw error
  }
}

export const fetchResources = <T>(
  resource: string,
  namespace?: string,
  limit?: number,
  continueToken?: string,
  labelSelector?: string,
  fieldSelector?: string
): Promise<T> => {
  let endpoint = namespace ? `/${resource}/${namespace}` : `/${resource}`
  const params = new URLSearchParams()

  if (limit) {
    params.append('limit', limit.toString())
  }
  if (continueToken) {
    params.append('continue', continueToken)
  }
  if (labelSelector) {
    params.append('labelSelector', labelSelector)
  }
  if (fieldSelector) {
    params.append('fieldSelector', fieldSelector)
  }

  if (params.toString()) {
    endpoint += `?${params.toString()}`
  }

  return fetchAPI<T>(endpoint)
}

export const fetchDeploymentRelated = (
  namespace: string,
  name: string
): Promise<DeploymentRelatedResource> => {
  const endpoint = `/deployments/${namespace}/${name}/related`
  return fetchAPI<DeploymentRelatedResource>(endpoint)
}

// Search API types
export interface SearchResult {
  id: string
  name: string
  namespace?: string
  resourceType: string
  createdAt: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

// Global search API
export const globalSearch = async (
  query: string,
  options?: {
    limit?: number
    namespace?: string
  }
): Promise<SearchResponse> => {
  if (query.length < 2) {
    return { results: [], total: 0 }
  }

  const params = new URLSearchParams({
    q: query,
    limit: String(options?.limit || 50),
  })

  if (options?.namespace) {
    params.append('namespace', options.namespace)
  }

  const endpoint = `/search?${params.toString()}`
  return fetchAPI<SearchResponse>(endpoint)
}

// Scale deployment API
export const scaleDeployment = async (
  namespace: string,
  name: string,
  replicas: number
): Promise<{ message: string; deployment: unknown; replicas: number }> => {
  const endpoint = `/deployments/${namespace}/${name}/scale`
  const response = await apiClient.post<{
    message: string
    deployment: unknown
    replicas: number
  }>(endpoint, {
    replicas,
  })

  return response
}

export const restartDeployment = async (
  namespace: string,
  name: string
): Promise<void> => {
  const endpoint = `/deployments/${namespace}/${name}/restart`
  await apiClient.post(`${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

// Node operation APIs
export const drainNode = async (
  nodeName: string,
  options: {
    force: boolean
    gracePeriod: number
    deleteLocalData: boolean
    ignoreDaemonsets: boolean
  }
): Promise<{ message: string; node: string; options: unknown }> => {
  const endpoint = `/nodes/_all/${nodeName}/drain`
  const response = await apiClient.post<{
    message: string
    node: string
    options: unknown
  }>(endpoint, options)

  return response
}

export const cordonNode = async (
  nodeName: string
): Promise<{ message: string; node: string; unschedulable: boolean }> => {
  const endpoint = `/nodes/_all/${nodeName}/cordon`
  const response = await apiClient.post<{
    message: string
    node: string
    unschedulable: boolean
  }>(endpoint)

  return response
}

export const uncordonNode = async (
  nodeName: string
): Promise<{ message: string; node: string; unschedulable: boolean }> => {
  const endpoint = `/nodes/_all/${nodeName}/uncordon`
  const response = await apiClient.post<{
    message: string
    node: string
    unschedulable: boolean
  }>(endpoint)

  return response
}

export const taintNode = async (
  nodeName: string,
  taint: {
    key: string
    value: string
    effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute'
  }
): Promise<{ message: string; node: string; taint: unknown }> => {
  const endpoint = `/nodes/_all/${nodeName}/taint`
  const response = await apiClient.post<{
    message: string
    node: string
    taint: unknown
  }>(endpoint, taint)

  return response
}

export const untaintNode = async (
  nodeName: string,
  key: string
): Promise<{ message: string; node: string; removedTaintKey: string }> => {
  const endpoint = `/nodes/_all/${nodeName}/untaint`
  const response = await apiClient.post<{
    message: string
    node: string
    removedTaintKey: string
  }>(endpoint, { key })

  return response
}

export const updateResource = async <T extends ResourceType>(
  resource: T,
  name: string,
  namespace: string | undefined,
  body: ResourceTypeMap[T]
): Promise<void> => {
  const endpoint = `/${resource}/${namespace || '_all'}/${name}`
  await apiClient.put(`${endpoint}`, body, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const createResource = async <T extends ResourceType>(
  resource: T,
  namespace: string | undefined,
  body: ResourceTypeMap[T]
): Promise<ResourceTypeMap[T]> => {
  const endpoint = `/${resource}/${namespace || '_all'}`
  return await apiClient.post<ResourceTypeMap[T]>(`${endpoint}`, body, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export const deleteResource = async <T extends ResourceType>(
  resource: T,
  name: string,
  namespace: string | undefined
): Promise<void> => {
  const endpoint = `/${resource}/${namespace || '_all'}/${name}`
  await apiClient.delete(`${endpoint}`)
}

// Apply resource from YAML
export interface ApplyResourceRequest {
  yaml: string
}

export interface ApplyResourceResponse {
  message: string
  kind: string
  name: string
  namespace?: string
}

export const applyResource = async (
  yaml: string
): Promise<ApplyResourceResponse> => {
  return await apiClient.post<ApplyResourceResponse>('/resources/apply', {
    yaml,
  })
}

export const useResourcesEvents = <T extends ResourceType>(
  resource: T,
  name: string,
  namespace?: string
) => {
  return useQuery({
    queryKey: ['resource-events', resource, namespace, name],
    queryFn: () => {
      const endpoint =
        '/events/resources?' +
        new URLSearchParams({
          resource: resource,
          name: name,
          namespace: namespace || '',
        }).toString()
      return fetchAPI<ResourcesTypeMap['events']>(endpoint)
    },
    select: (data: ResourcesTypeMap['events']): ResourcesItems<'events'> =>
      data.items,
    placeholderData: (prevData) => prevData,
  })
}

export const useResources = <T extends ResourceType>(
  resource: T,
  namespace?: string,
  options?: {
    staleTime?: number
    limit?: number
    labelSelector?: string
    fieldSelector?: string
    refreshInterval?: number
    disable?: boolean
  }
) => {
  return useQuery({
    queryKey: [
      resource,
      namespace,
      options?.limit,
      options?.labelSelector,
      options?.fieldSelector,
    ],
    queryFn: () => {
      return fetchResources<ResourcesTypeMap[T]>(
        resource,
        namespace,
        options?.limit,
        undefined,
        options?.labelSelector,
        options?.fieldSelector
      )
    },
    enabled: !options?.disable,
    select: (data: ResourcesTypeMap[T]): ResourcesItems<T> => data.items,
    placeholderData: (prevData) => prevData,
    retry(failureCount, error) {
      return failureCount < 3 && (error as unknown as Response).status > 500
    },
    refetchInterval: options?.refreshInterval || 0,
    staleTime: options?.staleTime || (resource === 'crds' ? 5000 : 1000),
  })
}

export const useResourcesV2 = <T extends ResourceType>(
  resource: T,
  namespace?: string,
  options?: {
    staleTime?: number
    limit?: number
    continue?: string
    labelSelector?: string
  }
): ReturnType<
  typeof useQuery<
    ResourcesTypeMap[T],
    Error,
    PaginatedResult<ResourcesItems<T>>
  >
> => {
  return useQuery({
    queryKey: [
      resource,
      namespace,
      options?.limit,
      options?.continue,
      options?.labelSelector,
    ],
    queryFn: () => {
      return fetchResources<ResourcesTypeMap[T]>(
        resource,
        namespace,
        options?.limit,
        options?.continue,
        options?.labelSelector
      )
    },
    enabled:
      clusterScopeResources.includes(resource) ||
      (namespace !== undefined && namespace !== ''),
    select: (data: ResourcesTypeMap[T]) => {
      return {
        items: data.items,
        pagination: {
          hasNextPage: !!data.metadata?.continue,
          nextContinueToken: data.metadata?.continue,
          remainingItems: data.metadata?.remainingItemCount,
        },
      }
    },
    placeholderData: (prevData) => prevData,
    staleTime: options?.staleTime || (resource === 'crds' ? 5000 : 1000),
  })
}

export const fetchResource = <T>(
  resource: string,
  name: string,
  namespace?: string
): Promise<T> => {
  const endpoint = namespace
    ? `/${resource}/${namespace}/${name}`
    : `/${resource}/${name}`
  return fetchAPI<T>(endpoint)
}
export const useResource = <T extends keyof ResourceTypeMap>(
  resource: T,
  name: string,
  namespace?: string,
  options?: { staleTime?: number; refreshInterval?: number }
) => {
  const ns = namespace || '_all'
  return useQuery({
    queryKey: [resource.slice(0, -1), ns, name], // Remove 's' from resource name for singular
    queryFn: () => {
      return fetchResource<ResourceTypeMap[T]>(resource, name, ns)
    },
    retry: 1,
    refetchOnWindowFocus: 'always',
    refetchInterval: options?.refreshInterval || 0, // Default to no auto-refresh
    placeholderData: (prevData) => prevData,
    staleTime: options?.staleTime || 1000,
  })
}

export const useDeploymentRelated = (
  namespace: string,
  name: string,
  options?: { staleTime?: number; refreshInterval?: number }
) => {
  return useQuery({
    queryKey: ['deployment-related', namespace, name],
    queryFn: () => fetchDeploymentRelated(namespace, name),
    enabled: !!namespace && !!name,
    staleTime: options?.staleTime || 1000,
    placeholderData: (prevData) => prevData,
    refetchInterval: options?.refreshInterval || 0,
  })
}

// Overview API
const fetchOverview = (): Promise<OverviewData> => {
  return fetchAPI<OverviewData>('/overview')
}

export const useOverview = (options?: { staleTime?: number }) => {
  return useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
    staleTime: options?.staleTime || 30000, // 30 seconds cache
    refetchInterval: 30000, // Auto refresh every 30 seconds
  })
}

// Resource Usage History API
export const fetchResourceUsageHistory = (
  duration: string,
  instance?: string
): Promise<ResourceUsageHistory> => {
  const endpoint = `/prometheus/resource-usage-history?duration=${duration}`
  if (instance) {
    return fetchAPI<ResourceUsageHistory>(
      `${endpoint}&instance=${encodeURIComponent(instance)}`
    )
  }
  return fetchAPI<ResourceUsageHistory>(endpoint)
}

export const useResourceUsageHistory = (
  duration: string,
  options?: { staleTime?: number; instance?: string }
) => {
  return useQuery({
    queryKey: ['resource-usage-history', duration, options?.instance],
    queryFn: () => fetchResourceUsageHistory(duration, options?.instance),
    staleTime: options?.staleTime || 10000, // 10 seconds cache
    refetchInterval: 30000, // Auto refresh every 30 seconds for historical data
    retry: 0,
    placeholderData: (prevData) => prevData, // Keep previous data while loading new data
  })
}

// Pod monitoring API functions
export const fetchPodMetrics = (
  namespace: string,
  podName: string,
  duration: string,
  container?: string,
  labelSelector?: string
): Promise<PodMetrics> => {
  let endpoint = `/prometheus/pods/${namespace}/${podName}/metrics?duration=${duration}`
  if (container) {
    endpoint += `&container=${encodeURIComponent(container)}`
  }
  if (labelSelector) {
    endpoint += `&labelSelector=${encodeURIComponent(labelSelector)}`
  }
  return fetchAPI<PodMetrics>(endpoint)
}

export const usePodMetrics = (
  namespace: string,
  podName: string,
  duration: string,
  options?: {
    staleTime?: number
    container?: string
    refreshInterval?: number
    labelSelector?: string
  }
) => {
  return useQuery({
    queryKey: [
      'pod-metrics',
      namespace,
      podName,
      duration,
      options?.container,
      options?.labelSelector,
    ],
    queryFn: () =>
      fetchPodMetrics(
        namespace,
        podName,
        duration,
        options?.container,
        options?.labelSelector
      ),
    enabled: !!namespace && !!podName,
    staleTime: options?.staleTime || 10000, // 10 seconds cache
    refetchInterval: options?.refreshInterval || 30 * 1000, // 1 second
    retry: 0,
    placeholderData: (prevData) => prevData,
  })
}

// Paginated resources hook for managing pagination state
export const usePaginatedResources = <T extends ResourceType>(
  resource: T,
  namespace?: string,
  options?: {
    staleTime?: number
    pageSize?: number
    initialContinueToken?: string
  }
) => {
  const [continueToken, setContinueToken] = useState<string | undefined>(
    options?.initialContinueToken
  )
  const [allItems, setAllItems] = useState<ResourcesItems<T>>(
    [] as ResourcesItems<T>
  )
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const pageSize = options?.pageSize || 20

  const query = useResourcesV2(resource, namespace, {
    staleTime: options?.staleTime,
    limit: pageSize,
    continue: continueToken,
  })

  const { data, isLoading, error, refetch } = query

  // Update all items when new data comes in
  useEffect(() => {
    if (data?.items) {
      if (!continueToken) {
        // First page or refresh
        setAllItems(data.items)
      } else {
        // Subsequent pages - append to existing items
        setAllItems((prev) => [...prev, ...data.items] as ResourcesItems<T>)
      }
      setIsLoadingMore(false)
    }
  }, [data, continueToken])

  const loadNextPage = useCallback(() => {
    if (
      data?.pagination.hasNextPage &&
      data.pagination.nextContinueToken &&
      !isLoadingMore
    ) {
      setIsLoadingMore(true)
      setContinueToken(data.pagination.nextContinueToken)
    }
  }, [data?.pagination, isLoadingMore])

  const reset = useCallback(() => {
    setContinueToken(undefined)
    setAllItems([] as ResourcesItems<T>)
    setIsLoadingMore(false)
  }, [])

  const refresh = useCallback(() => {
    reset()
    refetch()
  }, [reset, refetch])

  return {
    // Data
    items: allItems,
    currentPageItems: data?.items || ([] as ResourcesItems<T>),

    // Pagination info
    hasNextPage: data?.pagination.hasNextPage || false,
    remainingItems: data?.pagination.remainingItems,
    isLoadingMore,

    // Loading states
    isLoading: isLoading && !continueToken, // Only true for initial load
    isLoadingNextPage: isLoadingMore,

    // Error
    error,

    // Actions
    loadNextPage,
    refresh,
    reset,
  }
}

// Simple pagination hook for traditional page-by-page navigation
export const useSimplePagination = <T extends ResourceType>(
  resource: T,
  namespace?: string,
  pageSize: number = 20
) => {
  const [currentPage, setCurrentPage] = useState(0)
  const [continueTokens, setContinueTokens] = useState<(string | undefined)[]>([
    undefined,
  ])

  const query = useResourcesV2(resource, namespace, {
    limit: pageSize,
    continue: continueTokens[currentPage],
  })

  const { data, isLoading, error } = query

  const goToNextPage = useCallback(() => {
    if (data?.pagination.hasNextPage && data.pagination.nextContinueToken) {
      const nextPage = currentPage + 1
      setContinueTokens((prev) => {
        const newTokens = [...prev]
        newTokens[nextPage] = data.pagination.nextContinueToken
        return newTokens
      })
      setCurrentPage(nextPage)
    }
  }, [data?.pagination, currentPage])

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }, [currentPage])

  const resetPagination = useCallback(() => {
    setCurrentPage(0)
    setContinueTokens([undefined])
  }, [])

  return {
    // Data
    items: data?.items || ([] as ResourcesItems<T>),

    // Pagination info
    currentPage,
    hasNextPage: data?.pagination.hasNextPage || false,
    hasPreviousPage: currentPage > 0,
    remainingItems: data?.pagination.remainingItems,
    pageSize,

    // Loading states
    isLoading,

    // Error
    error,

    // Actions
    goToNextPage,
    goToPreviousPage,
    resetPagination,
  }
}

// Logs API functions
export interface LogsResponse {
  logs: string[]
  container?: string
  pod: string
  namespace: string
}

// Function to fetch static logs (follow=false)
export const fetchPodLogs = (
  namespace: string,
  podName: string,
  options?: {
    container?: string
    tailLines?: number
    timestamps?: boolean
    previous?: boolean
    sinceSeconds?: number
  }
): Promise<LogsResponse> => {
  const params = new URLSearchParams()
  params.append('follow', 'false') // Explicitly set follow=false for static logs

  if (options?.container) {
    params.append('container', options.container)
  }
  if (options?.tailLines !== undefined) {
    params.append('tailLines', options.tailLines.toString())
  }
  if (options?.timestamps !== undefined) {
    params.append('timestamps', options.timestamps.toString())
  }
  if (options?.previous !== undefined) {
    params.append('previous', options.previous.toString())
  }
  if (options?.sinceSeconds !== undefined) {
    params.append('sinceSeconds', options.sinceSeconds.toString())
  }

  const endpoint = `/logs/${namespace}/${podName}${params.toString() ? `?${params.toString()}` : ''}`
  return fetchAPI<LogsResponse>(endpoint)
}

// Function to create SSE-based logs connection (follow=true)
export const createLogsSSEStream = (
  namespace: string,
  podName: string,
  options?: {
    container?: string
    tailLines?: number
    timestamps?: boolean
    previous?: boolean
    sinceSeconds?: number
  },
  onMessage?: (data: string) => void,
  onError?: (error: Error) => void,
  onClose?: () => void,
  onOpen?: () => void
): EventSource => {
  const params = new URLSearchParams()
  params.append('follow', 'true') // Enable streaming

  if (options?.container) {
    params.append('container', options.container)
  }
  if (options?.tailLines !== undefined) {
    params.append('tailLines', options.tailLines.toString())
  }
  if (options?.timestamps !== undefined) {
    params.append('timestamps', options.timestamps.toString())
  }
  if (options?.previous !== undefined) {
    params.append('previous', options.previous.toString())
  }
  if (options?.sinceSeconds !== undefined) {
    params.append('sinceSeconds', options.sinceSeconds.toString())
  }

  const currentCluster = localStorage.getItem('current-cluster')
  if (currentCluster) {
    params.append('x-cluster-name', currentCluster)
  }

  const endpoint = `${API_BASE_URL}/logs/${namespace}/${podName}?${params.toString()}`
  const eventSource = new EventSource(endpoint, {
    withCredentials: true,
  })

  // Handle SSE open event
  eventSource.onopen = () => {
    console.log('SSE connection opened')
    if (onOpen) {
      onOpen()
    }
  }

  // Handle connection established
  eventSource.addEventListener('connected', (event: MessageEvent) => {
    console.log('SSE connection established:', event.data)
  })

  // Handle log messages
  eventSource.addEventListener('log', (event: MessageEvent) => {
    if (onMessage) {
      onMessage(event.data)
    }
  })

  // Handle errors from server
  eventSource.addEventListener('error', (event: MessageEvent) => {
    try {
      const errorData = JSON.parse(event.data)
      if (onError) {
        onError(new Error(errorData.error))
      }
    } catch {
      // This is not a server error event, likely a connection error
      console.warn('SSE error event without valid JSON data')
    }
  })

  // Handle connection close
  eventSource.addEventListener('close', () => {
    eventSource.close()
    if (onClose) {
      onClose()
    }
  })

  // Handle generic SSE errors (connection issues)
  eventSource.onerror = (event) => {
    console.error('SSE connection error:', event)
    if (eventSource.readyState === EventSource.CLOSED) {
      console.log('SSE connection closed')
      if (onClose) {
        onClose()
      }
    } else if (eventSource.readyState === EventSource.CONNECTING) {
      console.log('SSE reconnecting...')
    } else {
      if (onError) {
        onError(new Error('SSE connection error'))
      }
    }
  }

  return eventSource
}

// Hook for streaming logs with SSE and real-time updates
export const useLogsStream = (
  namespace: string,
  podName: string,
  options?: {
    container?: string
    tailLines?: number
    timestamps?: boolean
    previous?: boolean
    sinceSeconds?: number
    enabled?: boolean
    follow?: boolean
  }
) => {
  const [logs, setLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [downloadSpeed, setDownloadSpeed] = useState(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const networkStatsRef = useRef({
    lastReset: Date.now(),
    bytesReceived: 0,
  })
  const speedUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Clear speed update timer
    if (speedUpdateTimerRef.current) {
      clearInterval(speedUpdateTimerRef.current)
      speedUpdateTimerRef.current = null
    }

    setIsConnected(false)
    setIsLoading(false)
    setDownloadSpeed(0)
  }, [])

  const startStreaming = useCallback(async () => {
    if (!namespace || !podName || options?.enabled === false) return

    // Close any existing connection first to prevent race conditions
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    try {
      setIsLoading(true)
      setError(null)
      setLogs([]) // Clear previous logs when starting new stream

      if (options?.follow) {
        // Use SSE for follow mode
        const eventSource = createLogsSSEStream(
          namespace,
          podName,
          {
            container: options?.container,
            tailLines: options?.tailLines,
            timestamps: options?.timestamps,
            previous: options?.previous,
            sinceSeconds: options?.sinceSeconds,
          },
          // onMessage callback
          (logLine: string) => {
            // Calculate data size for network speed tracking
            const dataSize = new Blob([logLine]).size
            networkStatsRef.current.bytesReceived += dataSize

            setLogs((prev) => [...prev, logLine])
          },
          // onError callback
          (err: Error) => {
            setError(err)
            setIsLoading(false)
            setIsConnected(false)
          },
          // onClose callback
          () => {
            setIsLoading(false)
            setIsConnected(false)
          },
          // onOpen callback
          () => {
            setIsLoading(false)
            setIsConnected(true)
            setError(null)

            // Reset network stats and start speed tracking
            networkStatsRef.current = {
              lastReset: Date.now(),
              bytesReceived: 0,
            }
            setDownloadSpeed(0)

            // Start periodic speed update timer
            if (speedUpdateTimerRef.current) {
              clearInterval(speedUpdateTimerRef.current)
            }
            speedUpdateTimerRef.current = setInterval(() => {
              const now = Date.now()
              const stats = networkStatsRef.current
              const timeDiff = (now - stats.lastReset) / 1000

              if (timeDiff > 0) {
                const downloadSpeedValue = stats.bytesReceived / timeDiff
                setDownloadSpeed(downloadSpeedValue)

                // Reset counters every 3 seconds
                if (timeDiff >= 3) {
                  stats.lastReset = now
                  stats.bytesReceived = 0
                }
              }
            }, 500)
          }
        )

        eventSourceRef.current = eventSource
      } else {
        // Use static fetch for non-follow mode
        const response = await fetchPodLogs(namespace, podName, {
          container: options?.container,
          tailLines: options?.tailLines,
          timestamps: options?.timestamps,
          previous: options?.previous,
          sinceSeconds: options?.sinceSeconds,
        })

        setLogs(response.logs || [])
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err)
      }
    } finally {
      if (!options?.follow) {
        setIsLoading(false)
        setIsConnected(false)
      }
    }
  }, [
    namespace,
    podName,
    options?.container,
    options?.tailLines,
    options?.timestamps,
    options?.previous,
    options?.sinceSeconds,
    options?.enabled,
    options?.follow,
  ])

  const refetch = useCallback(() => {
    stopStreaming()
    setTimeout(startStreaming, 100) // Small delay to ensure cleanup
  }, [stopStreaming, startStreaming])

  useEffect(() => {
    if (options?.enabled !== false) {
      startStreaming()
    }

    return () => {
      stopStreaming()
    }
  }, [startStreaming, stopStreaming, options?.enabled])

  // Cleanup on unmount
  useEffect(() => {
    return stopStreaming
  }, [stopStreaming])

  return {
    logs,
    isLoading,
    error,
    isConnected,
    downloadSpeed,
    refetch,
    stopStreaming,
  }
}

export async function getImageTags(image: string): Promise<ImageTagInfo[]> {
  if (!image) return []
  const resp = await apiClient.get<ImageTagInfo[]>(
    `/image/tags?image=${encodeURIComponent(image)}`
  )
  return resp
}

export function useImageTags(image: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['image-tags', image],
    queryFn: () => getImageTags(image),
    enabled: !!image && (options?.enabled ?? true),
    staleTime: 60 * 1000, // 1 min
    placeholderData: (prev) => prev,
  })
}
