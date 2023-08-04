import { DEV } from "solid-js"

export const debug = (...args: unknown[]) => {
  if (DEV) console.debug(...args)
}
