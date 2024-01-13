import { Component, For, Match, Show, Switch, createMemo } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Note } from "@/app/components/common/note/note"
import { Pill } from "@/app/components/common/pill/pill"
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
import { useTableState } from "@/app/core/use-table-state"

import { IUserGroupRow, userGroupType } from "../user-groups/user-groups.codecs"
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
      classList={{ selected: props.selected }}
    >
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "0.1em",
          padding: "0.15em 0",
        }}
      >
        <Stack spacing="0.5em">
          <ListEntryLink href={`${props.group.id}`}>
            <Text fontWeight={500}>{props.group.name}</Text>
          </ListEntryLink>
          <Show when={props.group.group_type !== null}>
            <Stack
              style={{
                "margin-left": "0.5em",
              }}
            >
              <Switch>
                <Match when={props.group.group_type === userGroupType.everyone}>
                  <Text fontSize={"var(--text-sm)"}>
                    <Pill>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={"0.25em"}
                      >
                        <Icon name="settings" size={12} wght={500} />
                        <span>System group</span>
                      </Stack>
                    </Pill>
                  </Text>
                </Match>
                <Match when={props.group.group_type === userGroupType.user}>
                  <Text fontSize={"var(--text-sm)"}>
                    <Pill>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={"0.25em"}
                      >
                        <Icon name="settings" size={12} wght={500} />
                        <span>System group</span>
                      </Stack>
                    </Pill>
                  </Text>
                </Match>
              </Switch>
            </Stack>
          </Show>
        </Stack>
      </div>
    </div>
  )
}

export const UserGroupsList: Component = () => {
  const tableState = useTableState<number>({
    defaultRowsPerPage: 500,
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

  const userGroups = createMemo(
    () =>
      // eslint-disable-next-line no-confusing-arrow
      $userGroups.data?.user_groups.sort((group) =>
        group.group_type === null ? 1 : -1
      ) ?? []
  )

  return (
    <Show when={$userGroups.isSuccess}>
      <List>
        <ListHead
          style={{
            display: "flex",
            "flex-direction": "column",
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
        </ListHead>

        <Show when={userGroups().length === 0}>
          <Note type="secondary">No user groups found.</Note>
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
          when={($userGroups.data?.total_count ?? 0) > tableState.rowsPerPage()}
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
    </Show>
  )
}
