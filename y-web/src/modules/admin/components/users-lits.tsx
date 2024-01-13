import { Component, For, Show, createMemo, createSignal } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"
import { format } from "date-fns"

import { Button } from "@/app/components/common/button/button"
import { ExpandButton } from "@/app/components/common/expand-button/expand-button"
import {
  ExpandButtonEntries,
  ExpandButtonEntry,
} from "@/app/components/common/expand-button/expand-button-entry"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Modal } from "@/app/components/common/modal/modal"
import { Note } from "@/app/components/common/note/note"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { ListPageSwitcher } from "@/app/components/list-page-switcher/list-page-switcher"
import { ListEntryLink } from "@/app/components/list/components/list-entry-link"
import {
  List,
  ListEntries,
  ListFooter,
  ListHead,
} from "@/app/components/list/list"
import { toastCtl } from "@/app/core/toast"
import { useTableState } from "@/app/core/use-table-state"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { routes } from "@/app/routes"
import { IUser } from "@/modules/admin/users/users.codecs"
import { useUsers, usersKey } from "@/modules/admin/users/users.service"
import { useAuth } from "@/modules/core/auth/auth.service"

import { deleteUsers } from "../users/users.api"

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
          <ListEntryLink href={`${routes["/admin/users"]}/${props.user.id}`}>
            <Text fontWeight={500}>{props.user.username}</Text>
          </ListEntryLink>
          <Text
            variant="secondary"
            fontSize={"var(--text-sm)"}
            style={{
              "margin-left": "0.25em",
            }}
          >
            Joined {format(new Date(props.user.created_at), "dd.MM.yyyy")}
          </Text>
        </div>
      </div>
    </div>
  )
}

export const UsersList: Component = () => {
  const $auth = useAuth()
  const queryClient = useQueryClient()
  const { notify } = toastCtl

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

  const $deleteUsers = createMutation(deleteUsers)

  const deleteActionAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "delete_user"
      ) ?? false
  )

  const users = createMemo(() => $users.data?.users ?? [])

  const noneSelected = createMemo(() => tableState.selectedEntries().size === 0)

  const [deleteConfirmationModalOpen, setDeleteConfirmationModalOpen] =
    createSignal(false)

  return (
    <>
      <Modal
        open={deleteConfirmationModalOpen()}
        keepMounted
        onClose={() => setDeleteConfirmationModalOpen(false)}
        style={{
          "max-width": "450px",
        }}
        header={
          <Stack spacing={"1.5em"} direction="row" alignItems="center">
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "center",

                padding: "1em",

                "background-color": "var(--color-border-15)",
                "border-radius": "15px",
              }}
            >
              <Icon grad={25} wght={500} size={24} name="warning" />
            </div>
            <Stack spacing="0.5em">
              <Text
                variant="h2"
                style={{
                  margin: 0,
                }}
                color="var(--color-text-grey-025)"
              >
                Confirm action
              </Text>
            </Stack>
          </Stack>
        }
      >
        <Stack spacing={"1.5em"}>
          <Text>
            Are you sure you want to delete {tableState.selectedEntries().size}{" "}
            user(s)?
          </Text>

          <Text>
            This action is irreversible. All data associated with the users will
            be deleted forever.
          </Text>

          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={$deleteUsers.isLoading}
              onClick={() => {
                $deleteUsers.mutate(
                  {
                    userIds: [...tableState.selectedEntries()],
                  },
                  {
                    onSuccess: () => {
                      notify({
                        title: "Users deleted",
                        content: "Selected users were deleted",
                        severity: "success",
                        icon: "check",
                      })

                      setDeleteConfirmationModalOpen(false)
                      void queryClient.invalidateQueries([usersKey])
                      return tableState.setSelectedEntries(() => new Set())
                    },
                    onError: (error) => genericErrorToast(error),
                  }
                )
              }}
            >
              {$deleteUsers.isLoading ? "Deleting..." : "Delete"}
            </Button>
          </Stack>
        </Stack>
      </Modal>
      <Show when={$users.isSuccess}>
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
                    : `${tableState.selectedEntries().size} users`
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
                    <Show when={deleteActionAllowed()}>
                      <hr />
                      <ExpandButtonEntry
                        icon="delete"
                        variant="danger"
                        onClick={() => {
                          setDeleteConfirmationModalOpen(true)
                        }}
                      >
                        Delete
                      </ExpandButtonEntry>
                    </Show>
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
    </>
  )
}
