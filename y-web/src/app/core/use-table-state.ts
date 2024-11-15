import { batch, createMemo, createSignal } from "solid-js"

import { Direction } from "./request.utils"
import { DEFAULT_DEBOUNCE_MS } from "./utils"

const DEFAULT_ROWS_PER_PAGE = 50

export type UseTableStateConfig<TData> = {
  defaultDirection?: Direction
  defaultOrderBy?: string
  defaultSearch?: string
  defaultRowsPerPage?: number
  defaultPage?: number

  defaultSelectedEntries?: TData[]

  searchDebounceMs?: number
}

export const useTableState = <TData>(
  config: UseTableStateConfig<TData> = {}
) => {
  let timeout: number | undefined

  const [direction, setDirection] = createSignal<Direction>(
    config.defaultDirection || "asc"
  )
  const [orderBy, setOrderBy] = createSignal(config.defaultOrderBy)
  const [rowsPerPage, setRowsPerPage] = createSignal(
    config.defaultRowsPerPage ?? DEFAULT_ROWS_PER_PAGE
  )

  const [page, setPage] = createSignal(config.defaultPage || 0)

  const [searchText, setSearchText] = createSignal(config.defaultSearch || "")
  const [search, setSearch] = createSignal(config.defaultSearch || "")

  const [selectedEntries, setSelectedEntries] = createSignal<Set<TData>>(
    config.defaultSelectedEntries
      ? new Set(config.defaultSelectedEntries)
      : new Set(),
    {
      equals: false,
    }
  )

  const onSelect = (entry: TData) => {
    setSelectedEntries((entries) => {
      if (entries.has(entry)) {
        entries.delete(entry)
      } else {
        entries.add(entry)
      }

      return entries
    })
  }

  const skip = createMemo(() => page() * rowsPerPage())

  const onSearchChange = (newValue: string) => {
    batch(() => {
      setSearchText(newValue)

      clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        setSearch(newValue)
      }, config.searchDebounceMs ?? DEFAULT_DEBOUNCE_MS)

      setPage(0)
    })
  }

  const toInput = () => {
    return {
      search: search(),
      limit: rowsPerPage(),
      orderBy: orderBy(),
      direction: direction(),
      skip: skip(),
    }
  }

  return {
    direction,
    orderBy,
    searchText,
    search,
    selectedEntries,
    page,
    rowsPerPage,

    skip,

    setDirection,
    setOrderBy,
    setSearch: onSearchChange,
    setSelectedEntries,
    setPage,
    setRowsPerPage,

    onSelect,

    toInput,
  }
}
