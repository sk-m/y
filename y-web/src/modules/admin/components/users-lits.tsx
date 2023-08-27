import { Component, For, Show, createMemo } from "solid-js"

import { format } from "date-fns"

import { ExpandButton } from "@/app/components/common/expand-button/expand-button"
import {
  ExpandButtonEntries,
  ExpandButtonEntry,
} from "@/app/components/common/expand-button/expand-button-entry"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Note } from "@/app/components/common/note/note"
import { Text } from "@/app/components/common/text/text"
import { ListPageSwitcher } from "@/app/components/list-page-switcher/list-page-switcher"
import {
  List,
  ListEntries,
  ListFooter,
  ListHead,
} from "@/app/components/list/list"
import { useTableState } from "@/app/core/use-table-state"
import { IUser } from "@/modules/admin/users/users.codecs"
import { useUsers } from "@/modules/admin/users/users.service"

export type UserEntryProps = {
  user: IUser
  onSelect: (entry: number) => void
  selected: boolean
}

const UserEntry: Component<UserEntryProps> = (props) => {
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
          name={`user-${props.user.id}`}
          checked={props.selected}
          onChange={() => props.onSelect(props.user.id)}
        />
        <div>
          <Text monospace>{props.user.username}</Text>
          <Text variant="secondary">
            Joined{" "}
            {format(new Date(props.user.created_at), "dd.MM.yyyy, HH:mm")}
          </Text>
        </div>
      </div>

      <div class="entry-actions">
        <ExpandButton icon="build" variant="text">
          <ExpandButtonEntries>
            <ExpandButtonEntry variant="danger" icon="delete">
              Delete
            </ExpandButtonEntry>
          </ExpandButtonEntries>
        </ExpandButton>
      </div>
    </div>
  )
}

export const UsersList: Component = () => {
  const tableState = useTableState<number>({
    defaultRowsPerPage: 25,
  })

  const $users = useUsers(
    () => ({
      search: tableState.search(),
      limit: tableState.rowsPerPage(),
      orderBy: tableState.orderBy(),
      skip: tableState.skip(),
    }),
    {
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    }
  )

  const users = createMemo(() => $users.data?.users ?? [])

  return (
    <Show when={$users.isSuccess}>
      <List>
        <ListHead
          style={{
            display: "flex",
            "align-items": "center",
            gap: "1em",
          }}
        >
          <InputField
            placeholder="Search users"
            width="100%"
            monospace
            inputProps={{
              name: "users-search",
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
                  onClick={() => tableState.setSelectedEntries(() => new Set())}
                  icon="unpublished"
                >
                  Deselect
                </ExpandButtonEntry>

                <ExpandButtonEntry variant="danger" icon="delete">
                  Delete
                </ExpandButtonEntry>
              </ExpandButtonEntries>
            </ExpandButton>
          </Show>
        </ListHead>

        <Show when={users().length === 0}>
          <Note
            type="secondary"
            style={{
              "border-radius": "0",
            }}
          >
            No users found. Try changing your search query.
          </Note>
        </Show>

        <ListEntries>
          <For each={users()}>
            {(user) => (
              <UserEntry
                selected={tableState.selectedEntries().has(user.id)}
                onSelect={tableState.onSelect}
                user={user}
              />
            )}
          </For>
        </ListEntries>

        <ListFooter>
          <ListPageSwitcher
            currentPage={tableState.page()}
            rowsPerPage={tableState.rowsPerPage()}
            totalCount={$users.data?.total_count ?? 0}
            onPageChange={tableState.setPage}
            query={$users}
          />
        </ListFooter>
      </List>
    </Show>
  )
}
