/* eslint-disable sonarjs/no-duplicate-string */
import { Component, For, Show, createMemo } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { Note } from "@/app/components/common/note/note"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { ListEntryLink } from "@/app/components/list/components/list-entry-link"
import { List, ListEntries } from "@/app/components/list/list"
import { useTableState } from "@/app/core/use-table-state"
import { IStorageEndpointRow } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.codecs"
import { useStorageEndpoints } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"

import { StorageEndpointStatusPill } from "./storage-endpoint-status-pill"
import { StorageEndpointTypePill } from "./storage-endpoint-type-pill"

export type StorageEndpointEntryProps = {
  endpoint: IStorageEndpointRow
  onSelect: (entry: number) => void
  selected: boolean
}

const StorageEndpointEntry: Component<StorageEndpointEntryProps> = (props) => {
  return (
    <div
      style={{
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
      }}
      classList={{ selected: props.selected }}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "0.1em",
          padding: "0.33em 0",
        }}
      >
        <Stack spacing={"0.2em"}>
          <ListEntryLink href={`${props.endpoint.id}`}>
            <Text fontWeight={500}>{props.endpoint.name}</Text>
          </ListEntryLink>
          <Stack
            spacing="0.75em"
            style={{
              "margin-left": "0.5em",
            }}
          >
            <Stack direction="row" spacing={"0.5em"}>
              <StorageEndpointStatusPill status={props.endpoint.status} />
              <StorageEndpointTypePill type={props.endpoint.endpoint_type} />

              <Show when={props.endpoint.preserve_file_structure}>
                <Pill
                  variant="secondary"
                  style={{
                    "font-size": "var(--text-sm)",
                  }}
                >
                  <Stack spacing={"0.5em"} direction="row" alignItems="center">
                    <Icon name="account_tree" size={12} wght={500} />
                    <Text>preserved file structure</Text>
                  </Stack>
                </Pill>
              </Show>
            </Stack>

            <Show when={props.endpoint.description}>
              <Text variant="secondary" fontSize={"var(--text-sm)"}>
                {props.endpoint.description}
              </Text>
            </Show>
          </Stack>
        </Stack>
      </div>
    </div>
  )
}

export const StorageEndpointsList: Component = () => {
  const tableState = useTableState<number>({
    defaultRowsPerPage: 500,
  })

  const $storageEndpoints = useStorageEndpoints(() => ({}), {
    refetchOnWindowFocus: true,
  })

  const endpoints = createMemo(
    () => $storageEndpoints.data?.storage_endpoints ?? []
  )

  return (
    <Show when={$storageEndpoints.isSuccess}>
      <List>
        <Show when={endpoints().length === 0}>
          <Note type="secondary">No endpoints found.</Note>
        </Show>

        <ListEntries>
          <For each={endpoints()}>
            {(endpoint) => (
              <StorageEndpointEntry
                selected={tableState.selectedEntries().has(endpoint.id)}
                onSelect={tableState.onSelect}
                endpoint={endpoint}
              />
            )}
          </For>
        </ListEntries>
      </List>
    </Show>
  )
}
