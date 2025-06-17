import { useEffect } from 'react'

export function useInterval(callback: () => void, delay: number) {
  useEffect(() => {
    const interval = setInterval(callback, delay)
    return () => clearInterval(interval)
  }, [callback, delay])
}
