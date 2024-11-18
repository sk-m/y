import { DEV } from "solid-js"

export const DEFAULT_DEBOUNCE_MS = 350

export type Tail<T extends unknown[]> = T extends [unknown, ...infer R]
  ? R
  : never

export type ServiceOptions = Partial<{
  refetchOnWindowFocus: boolean
  refetchInterval: number
  refetchOnMount: boolean
  useErrorBoundary: boolean
}>

export const debug = (...args: unknown[]) => {
  if (DEV) console.debug(...args)
}

export const lerp = (a: number, b: number, alpha: number) => {
  // prettier-ignore
  return a + (alpha * (b - a))
}

// Because firefox is a special snowflake sometimes
export const isFirefox = /firefox/i.test(navigator.userAgent)
