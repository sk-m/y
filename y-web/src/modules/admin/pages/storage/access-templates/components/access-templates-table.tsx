import { Component, For, Show, createMemo, createSignal } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

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
import { ListEntryTitleLeader } from "@/app/components/list/components/list-entry-title-leader"
import {
  List,
  ListEntries,
  ListFooter,
  ListHead,
} from "@/app/components/list/list"
import { toastCtl } from "@/app/core/toast"
import { useTableState } from "@/app/core/use-table-state"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { useAuth } from "@/modules/core/auth/auth.service"
import { deleteStorageAccessRulesTemplates } from "@/modules/storage/storage-access-rules-template/storage-access-rules-template.api"
import { IStorageAccessRulesTemplate } from "@/modules/storage/storage-access-rules-template/storage-access-rules-template.codecs"
import {
  storageAccessRulesTemplatesKey,
  useStorageAccessRulesTemplates,
} from "@/modules/storage/storage-access-rules-template/storage-access-rules-template.service"

export type TemplateEntryProps = {
  template: IStorageAccessRulesTemplate
  onSelect: (entry: number) => void
  selected: boolean
}

const TemplateEntry: Component<TemplateEntryProps> = (props) => {
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
          name={`storage-access-template-${props.template.id}`}
          checked={props.selected}
          onChange={() => props.onSelect(props.template.id)}
        />
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
            gap: "0.1em",
            padding: "0.1em 0",
          }}
        >
          <Stack direction="row" alignItems="center">
            <ListEntryTitleLeader>{props.template.id}.</ListEntryTitleLeader>
            <Text fontWeight={500}>{props.template.name}</Text>
          </Stack>
        </div>
      </div>
    </div>
  )
}

export const StorageAccessTemplatesList: Component = () => {
  const $auth = useAuth()
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  const tableState = useTableState<number>({
    defaultRowsPerPage: 25,
  })

  const $templates = useStorageAccessRulesTemplates(
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

  const $deleteTemplates = createMutation(deleteStorageAccessRulesTemplates)

  const deleteActionAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) =>
          right.right_name === "storage_manage_access" &&
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          right.right_options?.["allow_managing_templates"] === true
      ) ?? false
  )

  const templates = createMemo(() => $templates.data?.templates ?? [])

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
            template(s)?
          </Text>

          <Text>
            This action is irreversible. Templates will be automatically
            unassigned from all entries that include them.
          </Text>

          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={$deleteTemplates.isLoading}
              color="red"
              onClick={() => {
                $deleteTemplates.mutate(
                  {
                    templateIds: [...tableState.selectedEntries()],
                  },
                  {
                    onSuccess: () => {
                      notify({
                        title: "Templates deleted",
                        content: "Selected templates were deleted",
                        severity: "success",
                        icon: "check",
                      })

                      setDeleteConfirmationModalOpen(false)
                      void queryClient.invalidateQueries([
                        storageAccessRulesTemplatesKey,
                      ])
                      return tableState.setSelectedEntries(() => new Set())
                    },
                    onError: (error) => genericErrorToast(error),
                  }
                )
              }}
            >
              {$deleteTemplates.isLoading ? "Deleting..." : "Delete"}
            </Button>
          </Stack>
        </Stack>
      </Modal>
      <Show when={$templates.isSuccess}>
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
              <InputField
                label="Search query"
                width="100%"
                inputProps={{
                  name: "storage-access-templates-search",
                  autocomplete: "off",
                  value: tableState.searchText(),
                  onInput: (event) =>
                    tableState.setSearch(event.currentTarget.value),
                }}
              />

              <ExpandButton
                icon={noneSelected() ? "select" : "select_all"}
                position="right"
                label={
                  noneSelected()
                    ? null
                    : `${tableState.selectedEntries().size} templates`
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
                            () => new Set(templates().map((group) => group.id))
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
            </div>
          </ListHead>

          <Show when={templates().length === 0}>
            <Note type="secondary">
              No templates found. Try changing your search query.
            </Note>
          </Show>

          <ListEntries>
            <For each={templates()}>
              {(template) => (
                <TemplateEntry
                  selected={tableState.selectedEntries().has(template.id)}
                  onSelect={tableState.onSelect}
                  template={template}
                />
              )}
            </For>
          </ListEntries>

          <ListFooter>
            <ListPageSwitcher
              currentPage={tableState.page()}
              rowsPerPage={tableState.rowsPerPage()}
              totalCount={$templates.data?.total_count ?? 0}
              currentCount={$templates.data?.templates.length ?? 0}
              onPageChange={tableState.setPage}
              query={$templates}
            />
          </ListFooter>
        </List>
      </Show>
    </>
  )
}
