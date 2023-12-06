import { Component, For, Show, createMemo, createSignal } from "solid-js"

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

import { AdminUpdateUserPasswordModal } from "./user/update-user-password-modal"

export type UserEntryProps = {
  user: IUser
  onSelect: (entry: number) => void
  selected: boolean

  onChangePassword: () => void
}

const UserEntry: Component<UserEntryProps> = (props) => {
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
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "0.1em",
            padding: "0.1em 0",
          }}
        >
          <Text fontWeight={500}>{props.user.username}</Text>
          <Text variant="secondary" fontSize={"var(--text-sm)"}>
            Joined {format(new Date(props.user.created_at), "dd.MM.yyyy")}
          </Text>
        </div>
      </div>

      <div class="entry-actions">
        <ExpandButton icon="more_horiz" variant="text">
          <ExpandButtonEntries>
            <ExpandButtonEntry icon="key" onClick={props.onChangePassword}>
              Update password
            </ExpandButtonEntry>
          </ExpandButtonEntries>
        </ExpandButton>
      </div>
    </div>
  )
}

export const UsersList: Component = () => {
  const [userToUpdatePassword, setUserToUpdatePassword] =
    createSignal<IUser | null>(null)

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

  const noneSelected = createMemo(() => tableState.selectedEntries().size === 0)

  return (
    <Show when={$users.isSuccess}>
      <AdminUpdateUserPasswordModal
        user={userToUpdatePassword()}
        open={Boolean(userToUpdatePassword())}
        onClose={() => setUserToUpdatePassword(null)}
      />

      <List>
        <ListHead
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "1em",
          }}
        >
          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "1em",
            }}
          >
            <ExpandButton
              icon={noneSelected() ? "select" : "select_all"}
              position="right"
              label={
                noneSelected()
                  ? null
                  : `${tableState.selectedEntries().size} groups`
              }
            >
              <ExpandButtonEntries>
                <Show
                  when={!noneSelected()}
                  fallback={
                    <ExpandButtonEntry
                      onClick={() =>
                        tableState.setSelectedEntries(
                          // eslint-disable-next-line solid/reactivity
                          () => new Set(users().map((group) => group.id))
                        )
                      }
                      icon="select_all"
                    >
                      Select all
                    </ExpandButtonEntry>
                  }
                >
                  <ExpandButtonEntry
                    onClick={() =>
                      tableState.setSelectedEntries(() => new Set())
                    }
                    icon="select"
                  >
                    Deselect
                  </ExpandButtonEntry>
                  <hr />
                  <ExpandButtonEntry icon="delete" variant="danger">
                    Delete
                  </ExpandButtonEntry>
                </Show>
              </ExpandButtonEntries>
            </ExpandButton>
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
          </div>
        </ListHead>

        <Show when={users().length === 0}>
          <Note type="secondary">
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
                onChangePassword={() => setUserToUpdatePassword(user)}
              />
            )}
          </For>
        </ListEntries>

        <ListFooter>
          <ListPageSwitcher
            currentPage={tableState.page()}
            rowsPerPage={tableState.rowsPerPage()}
            totalCount={$users.data?.total_count ?? 0}
            currentCount={$users.data?.users.length ?? 0}
            onPageChange={tableState.setPage}
            query={$users}
          />
        </ListFooter>
      </List>
    </Show>
  )
}
