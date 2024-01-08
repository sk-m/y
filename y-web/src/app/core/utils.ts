import { DEV } from "solid-js"

export const DEFAULT_DEBOUNCE_MS = 350

export type Tail<T extends unknown[]> = T extends [unknown, ...infer R]
  ? R
  : never

export const debug = (...args: unknown[]) => {
  if (DEV) console.debug(...args)
}
