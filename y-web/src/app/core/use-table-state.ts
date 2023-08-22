import { batch, createMemo, createSignal } from "solid-js"

import { DEFAULT_DEBOUNCE_MS } from "./utils"

const DEFAULT_ROWS_PER_PAGE = 50

export type Order = "asc" | "desc"

export type UseTableStateConfig<TData> = {
  defaultOrder?: Order
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

  const [order, setOrder] = createSignal<Order>(config.defaultOrder || "asc")
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

  return {
    order,
    orderBy,
    searchText,
    search,
    selectedEntries,
    page,
    rowsPerPage,

    skip,

    setOrder,
    setOrderBy,
    setSearch: onSearchChange,
    setSelectedEntries,
    setPage,
    setRowsPerPage,

    onSelect,
  }
}
