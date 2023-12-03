import { createSignal } from "solid-js"

import { flatten, resolveTemplate, translator } from "@solid-primitives/i18n"

import * as en from "../i18n/en.json"

const dict = {
  en,
} as const

type Locale = keyof typeof dict

export const [locale, setLocale] = createSignal<Locale>("en")

// eslint-disable-next-line solid/reactivity
const flatDict = flatten(dict[locale()])

export const t = translator(() => flatDict, resolveTemplate)

// eslint-disable-next-line @typescript-eslint/naming-convention
export const unsafe_t = t as (key: string) => string | undefined
