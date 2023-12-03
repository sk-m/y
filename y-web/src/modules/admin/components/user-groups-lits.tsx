import { Component, For, Show, createMemo } from "solid-js"

import { Card } from "@/app/components/common/card/card"
import { ExpandButton } from "@/app/components/common/expand-button/expand-button"
import {
  ExpandButtonEntries,
  ExpandButtonEntry,
} from "@/app/components/common/expand-button/expand-button-entry"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Note } from "@/app/components/common/note/note"
import { Text } from "@/app/components/common/text/text"
import { ListPageSwitcher } from "@/app/components/list-page-switcher/list-page-switcher"
import { ListEntryLink } from "@/app/components/list/components/list-entry-link"
import {
  List,
  ListEntries,
  ListFooter,
  ListHead,
} from "@/app/components/list/list"
import { useTableState } from "@/app/core/use-table-state"

import { IUserGroupRow } from "../user-groups/user-groups.codecs"
import { useUserGroups } from "../user-groups/user-groups.service"

export type UserGroupEntryProps = {
  group: IUserGroupRow
  onSelect: (entry: number) => void
  selected: boolean
}

const UserGroupEntry: Component<UserGroupEntryProps> = (props) => {
  return (
    <div
      style={{
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
      }}
    >
      <div
        style={{
          display: "flex",
          "align-items": "center",
          gap: "1em",
        }}
      >
        <input
          type="checkbox"
          name={`user-${props.group.id}`}
          checked={props.selected}
          onChange={() => props.onSelect(props.group.id)}
        />
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "0.1em",
          }}
        >
          <ListEntryLink href={`${props.group.id}`}>
            <Text fontWeight={500}>{props.group.name}</Text>
          </ListEntryLink>
        </div>
      </div>

      <div class="entry-actions">
        <ExpandButton icon="more_horiz" variant="text">
          <ExpandButtonEntries>
            <ExpandButtonEntry icon="delete" variant="danger">
              Delete
            </ExpandButtonEntry>
          </ExpandButtonEntries>
        </ExpandButton>
      </div>
    </div>
  )
}

export const UserGroupsList: Component = () => {
  const tableState = useTableState<number>({
    defaultRowsPerPage: 100,
  })

  const $userGroups = useUserGroups(
    () => ({
      search: tableState.search(),
      limit: tableState.rowsPerPage(),
      orderBy: tableState.orderBy(),
      skip: tableState.skip(),
    }),
    {
      refetchOnWindowFocus: true,
    }
  )

  const userGroups = createMemo(() => $userGroups.data?.user_groups ?? [])

  return (
    <Show when={$userGroups.isSuccess}>
      <Card
        style={{
          padding: "0",
        }}
      >
        <List>
          <ListHead
            style={{
              display: "flex",
              "flex-direction": "column",
              gap: "1em",
            }}
          >
            <Text
              variant="h2"
              style={{
                margin: "0",
              }}
            >
              User groups
            </Text>
            <Text variant="secondary">You can search by group name.</Text>

            <div
              style={{
                display: "flex",
                "align-items": "center",
                gap: "1em",
              }}
            >
              <InputField
                placeholder="Search user groups"
                width="100%"
                monospace
                inputProps={{
                  name: "user-groups-search",
                  autocomplete: "off",
                  value: tableState.searchText(),
                  onInput: (event) =>
                    tableState.setSearch(event.currentTarget.value),
                }}
              />
              <Show when={tableState.selectedEntries().size > 0}>
                <ExpandButton
                  icon="bolt"
                  label={`${tableState.selectedEntries().size} selected`}
                >
                  <ExpandButtonEntries>
                    <ExpandButtonEntry
                      onClick={() =>
                        tableState.setSelectedEntries(() => new Set())
                      }
                      icon="unpublished"
                    >
                      Deselect
                    </ExpandButtonEntry>
                    <ExpandButtonEntry icon="delete" variant="danger">
                      Delete
                    </ExpandButtonEntry>
                  </ExpandButtonEntries>
                </ExpandButton>
              </Show>
            </div>
          </ListHead>

          <Show when={userGroups().length === 0}>
            <Note
              type="secondary"
              style={{
                "border-radius": "0",
              }}
            >
              No user groups found. Try changing your search query.
            </Note>
          </Show>

          <ListEntries>
            <For each={userGroups()}>
              {(group) => (
                <UserGroupEntry
                  selected={tableState.selectedEntries().has(group.id)}
                  onSelect={tableState.onSelect}
                  group={group}
                />
              )}
            </For>
          </ListEntries>

          <Show
            when={
              ($userGroups.data?.total_count ?? 0) > tableState.rowsPerPage()
            }
          >
            <ListFooter>
              <ListPageSwitcher
                currentPage={tableState.page()}
                rowsPerPage={tableState.rowsPerPage()}
                totalCount={$userGroups.data?.total_count ?? 0}
                onPageChange={tableState.setPage}
                query={$userGroups}
              />
            </ListFooter>
          </Show>
        </List>
      </Card>
    </Show>
  )
}
