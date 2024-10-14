// TODO split this file. 900+ lines is a *bit* too much IMO
import {
  Component,
  For,
  Match,
  Show,
  Switch,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
} from "solid-js"
import {
  SetStoreFunction,
  createStore,
  produce,
  reconcile,
} from "solid-js/store"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { InputField } from "@/app/components/common/input-field/input-field"
import { Note } from "@/app/components/common/note/note"
import { SelectField } from "@/app/components/common/select-field/select-field"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { useModal } from "@/app/core/util/use-modal"
import { DEFAULT_DEBOUNCE_MS } from "@/app/core/utils"
import { useUserGroups } from "@/modules/admin/user-groups/user-groups.service"
import { useUsers } from "@/modules/admin/users/users.service"

import {
  addStorageEntryAccessRulesTemplate,
  createStorageAccessRules,
  removeStorageEntryAccessRulesTemplate,
} from "../storage-access-rule/storage-access-rule.api"
import {
  IStorageAccessRule,
  IStorageAccessRuleAccessType,
  IStorageAccessRuleActionType,
  IStorageAccessRuleExecutorType,
} from "../storage-access-rule/storage-access-rule.codecs"
import { storageEntryAccessRulesKey } from "../storage-access-rule/storage-access-rule.service"
import { createStorageAccessRulesTemplate } from "../storage-access-rules-template/storage-access-rules-template.api"
import { useStorageAccessRulesTemplates } from "../storage-access-rules-template/storage-access-rules-template.service"
import { useStorageEndpoints } from "../storage-endpoint/storage-endpoint.service"
import "./storage-access-field.less"
import {
  CreateAccessRulesTemplateFormValues,
  CreateAccessRulesTemplateModal,
} from "./storage-access-field/create-access-rules-template-modal"

export type StorageEntryAccessActions = {
  [key in IStorageAccessRuleActionType]: IStorageAccessRuleAccessType
}

export type StorageEntryExecutor = {
  executorType: IStorageAccessRuleExecutorType
  executorId: number
  executorName: string
  actions: StorageEntryAccessActions
}

export type StorageEntryAccessSettings = {
  executors: StorageEntryExecutor[]
  templates: Array<{
    id: number
    name: string
  }>
}

type StorageAccessAvailableExecutorProps = {
  executorType: IStorageAccessRuleExecutorType
  executorId: number
  executorName: string

  selected: boolean
  onSelect: (selected: boolean) => void
}

const StorageAccessAvailableExecutor: Component<
  StorageAccessAvailableExecutorProps
> = (props) => {
  return (
    <div class="available-executor">
      <div class="select-checkbox">
        <input
          disabled={props.selected}
          type="checkbox"
          checked={props.selected}
          onChange={(event) => props.onSelect(event.currentTarget.checked)}
        />
      </div>
      <div class="executor">
        <div class="icon">
          <Icon
            name={props.executorType === "user" ? "person" : "group"}
            wght={500}
            size={12}
            fill={1}
          />
        </div>
        <div class="name">{props.executorName}</div>
      </div>
    </div>
  )
}

type StorageAccessSelectedExecutorActionProps = {
  executorIndex: number

  actionType: IStorageAccessRuleActionType
  accessType: IStorageAccessRuleAccessType

  setState: SetStoreFunction<StorageEntryAccessSettings>
}

const StorageAccessSelectedExecutorAction: Component<
  StorageAccessSelectedExecutorActionProps
> = (props) => {
  const setAccessType = (newAccessType: IStorageAccessRuleAccessType) => {
    props.setState(
      "executors",
      props.executorIndex,
      "actions",
      props.actionType,
      newAccessType
    )
  }

  return (
    <div class="action">
      <div class="label">
        <div class="name">{props.actionType}</div>
      </div>
      <div class="access-type-selector">
        <button
          title={`allow ${props.actionType}`}
          onClick={() => setAccessType("allow")}
          onMouseMove={(event) => {
            event.preventDefault()
            if (event.buttons === 1) {
              setAccessType("allow")
            }
          }}
          classList={{
            "access-type": true,
            allow: true,
            selected: props.accessType === "allow",
          }}
        >
          <Icon name="check" wght={600} size={12} fill={1} />
        </button>
        <button
          title={`deny ${props.actionType}`}
          onClick={() => setAccessType("deny")}
          onMouseMove={(event) => {
            event.preventDefault()
            if (event.buttons === 1) {
              setAccessType("deny")
            }
          }}
          classList={{
            "access-type": true,
            deny: true,
            selected: props.accessType === "deny",
          }}
        >
          <Icon name="block" wght={600} size={12} fill={1} />
        </button>
        <button
          title={`inherit ${props.actionType} from parent`}
          onClick={() => setAccessType("inherit")}
          onMouseMove={(event) => {
            event.preventDefault()
            if (event.buttons === 1) {
              setAccessType("inherit")
            }
          }}
          classList={{
            "access-type": true,
            none: true,
            selected: props.accessType === "inherit",
          }}
        >
          <Icon name="remove" wght={600} size={12} fill={1} />
        </button>
      </div>
    </div>
  )
}

export type StorageAccessFieldProps = {
  endpointId: number
  entryType: "file" | "folder"
  entryId: number

  value: StorageEntryAccessSettings

  readonly?: boolean
}

export const StorageAccessField: Component<StorageAccessFieldProps> = (
  props
) => {
  const { notify } = toastCtl
  const queryClient = useQueryClient()

  const [executorsSearchFieldValue, setExecutorsSearchFieldValue] =
    createSignal("")

  const [executorsSearch, setExecutorsSearch] = createSignal("")
  const [addTemplateSearch, setAddTemplateSearch] = createSignal("")

  let executorsSearchTimeout: number | undefined

  // TODO create a debounce util hook
  createEffect(
    on(executorsSearchFieldValue, () => {
      clearTimeout(executorsSearchTimeout)

      executorsSearchTimeout = setTimeout(() => {
        setExecutorsSearch(executorsSearchFieldValue())
      }, DEFAULT_DEBOUNCE_MS)
    })
  )

  const $storageEndpoints = useStorageEndpoints()

  const areAccessRulesEnforced = createMemo(
    () =>
      $storageEndpoints.data?.endpoints.find(
        (endpoint) => endpoint.id === props.endpointId
      )?.access_rules_enabled ?? false
  )

  // eslint-disable-next-line solid/reactivity
  const [state, setState] = createStore<StorageEntryAccessSettings>({
    executors: [],
    templates: [],
  })

  const [selectedExecutors, setSelectedExecutors] = createSignal<
    StorageEntryExecutor[]
  >([])

  const [isFieldExpanded, setIsFieldExpanded] = createSignal(true)
  const [isAvailableExecutorsOpen, setIsAvailableExecutorsOpen] =
    createSignal(false)

  const createTemplateModal = useModal()

  const toggleAvailableExecutorsOpen = () =>
    setIsAvailableExecutorsOpen((value) => !value)
  const toggleFieldExpanded = () => setIsFieldExpanded((value) => !value)

  const $removeStorageEntryAccessRulesTemplate = createMutation(
    removeStorageEntryAccessRulesTemplate
  )
  const $addStorageEntryAccessRulesTemplate = createMutation(
    addStorageEntryAccessRulesTemplate
  )

  const $createStorageAccessRules = createMutation(createStorageAccessRules)
  const $createStorageAccessRulesTemplate = createMutation(
    createStorageAccessRulesTemplate
  )

  const $userGroups = useUserGroups(() => ({
    search: executorsSearch(),
  }))
  const userGroups = createMemo(() => $userGroups.data?.user_groups ?? [])

  const $users = useUsers(() => ({
    limit: 20,
    search: executorsSearch(),
  }))
  const users = createMemo(() => $users.data?.users ?? [])

  const $availableTemplates = useStorageAccessRulesTemplates(() => ({
    limit: 20,
    orderBy: "name",
    search: addTemplateSearch(),
    skip: 0,
  }))

  const availableTemplates = createMemo(
    () => $availableTemplates.data?.templates ?? []
  )

  // TODO ugly
  const availableTemplatesOptions = createMemo(() =>
    availableTemplates().map((template) => ({
      id: template.id.toString(),
      name: template.name,
    }))
  )

  // TODO optimize
  const selectedUserIds = createMemo(() =>
    state.executors
      .filter((executor) => executor.executorType === "user")
      .map((executor) => executor.executorId)
  )

  const selectedGroupIds = createMemo(() =>
    state.executors
      .filter((executor) => executor.executorType === "user_group")
      .map((executor) => executor.executorId)
  )

  const selectExecutor = (executor: StorageEntryExecutor) => {
    setSelectedExecutors((executors) => {
      return executors.includes(executor)
        ? executors.filter((id) => id !== executor)
        : [...executors, executor]
    })
  }

  createEffect(() => {
    // TODO stucturedClone hack
    // TODO one setState please
    batch(() => {
      setState("executors", structuredClone(props.value.executors))
      setState("templates", props.value.templates)
      setSelectedExecutors([])
    })
  })

  const resetField = () => {
    batch(() => {
      setState("executors", reconcile(props.value.executors))
      setState("templates", props.value.templates)
      setSelectedExecutors([])
    })
  }

  const saveAccessRules = () => {
    const rules: IStorageAccessRule[] = []

    for (const executor of state.executors) {
      for (const [actionType, accessType] of Object.entries(executor.actions)) {
        rules.push({
          access_type: accessType,
          action: actionType as IStorageAccessRuleActionType,
          executor_type: executor.executorType,
          executor_id: executor.executorId,
          executor_name: null,
        })
      }
    }

    void $createStorageAccessRules.mutate(
      {
        endpointId: props.endpointId,
        entryId: props.entryId,

        rules,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([
            storageEntryAccessRulesKey,
            props.endpointId,
            props.entryId,
          ])

          notify({
            // eslint-disable-next-line sonarjs/no-duplicate-string
            title: "Access rules saved",
            severity: "success",
            icon: "check",
          })
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  const removeExecutor = (executorIndex: number) => {
    setState(
      "executors",
      produce((executors) => {
        executors.splice(executorIndex, 1)
      })
    )
  }

  const onSelectExecutor = (
    executorType: IStorageAccessRuleExecutorType,
    executorId: number,
    executorName: string,
    selected: boolean
  ) => {
    // TODO optimize
    if (selected) {
      setState("executors", [
        ...state.executors,
        {
          executorType,
          executorId,
          executorName,
          actions: {
            list_entries: "inherit",
            download: "inherit",
            upload: "inherit",
            rename: "inherit",
            move: "inherit",
            delete: "inherit",
            manage_access: "inherit",
          },
        },
      ])
    } else {
      setState(
        "executors",
        state.executors.filter(
          (executor) =>
            executor.executorId !== executorId ||
            executor.executorType !== executorType
        )
      )
    }
  }

  const createAccessRulesTemplate = (
    values: CreateAccessRulesTemplateFormValues
  ) => {
    const rules: IStorageAccessRule[] = []

    for (const executor of selectedExecutors()) {
      for (const [actionType, accessType] of Object.entries(executor.actions)) {
        rules.push({
          access_type: accessType,
          action: actionType as IStorageAccessRuleActionType,
          executor_type: executor.executorType,
          executor_id: executor.executorId,
          executor_name: null,
        })
      }
    }

    void $createStorageAccessRulesTemplate.mutate(
      {
        name: values.name,

        initialEndpointId: props.endpointId,
        initialEntryId: props.entryId,

        rules,
      },
      {
        onSuccess: () => {
          notify({
            title: "Access rules saved",
            content: "Template created",
            severity: "success",
            icon: "check",
          })

          setState(
            "executors",
            state.executors.filter(
              (executor) => !selectedExecutors().includes(executor)
            )
          )

          saveAccessRules()
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  const addAccessRulesTemplate = (templateId: number) => {
    void $addStorageEntryAccessRulesTemplate.mutate(
      {
        endpointId: props.endpointId,
        entryId: props.entryId,
        templateId,
      },
      {
        onSuccess: () => {
          notify({
            title: "Access rules saved",
            content: "Template added",
            severity: "success",
            icon: "check",
          })

          void queryClient.invalidateQueries([
            storageEntryAccessRulesKey,
            props.endpointId,
            props.entryId,
          ])
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  const removeAccessRulesTemplate = (templateId: number) => {
    void $removeStorageEntryAccessRulesTemplate.mutate(
      {
        endpointId: props.endpointId,
        entryId: props.entryId,
        templateId,
      },
      {
        onSuccess: () => {
          notify({
            title: "Access rules saved",
            content: "Template removed",
            severity: "success",
            icon: "check",
          })

          void queryClient.invalidateQueries([
            storageEntryAccessRulesKey,
            props.endpointId,
            props.entryId,
          ])
        },
        onError: (error) => genericErrorToast(error),
      }
    )
  }

  return (
    <>
      <CreateAccessRulesTemplateModal
        open={createTemplateModal.isOpen()}
        onClose={createTemplateModal.setClose}
        onCreate={createAccessRulesTemplate}
        numOfRules={selectedExecutors().length}
      />
      <div
        classList={{
          "storage-access-field": true,
          open: isAvailableExecutorsOpen(),
        }}
      >
        <div class="field-label" onClick={toggleFieldExpanded}>
          <div class="label">Access</div>
          <div class="expand-arrow">
            <Icon
              name={isFieldExpanded() ? "expand_less" : "expand_more"}
              size={14}
              wght={600}
            />
          </div>
        </div>

        <Show when={!areAccessRulesEnforced()}>
          <Stack
            style={{
              padding: "0 0.75em 0.75em 0.75em",
            }}
          >
            <Note
              type="critical"
              fontSize="var(--text-sm)"
              style={{
                "font-weight": 500,
              }}
            >
              Access rules are disabled
            </Note>
          </Stack>
        </Show>

        <Show when={isFieldExpanded()}>
          <div class="value">
            <div class="section">
              <div class="section-label">Templates</div>

              <div class="add-template">
                <SelectField
                  multi={false}
                  options={availableTemplatesOptions()}
                  value={() => null}
                  onChange={(newTemplateId) =>
                    addAccessRulesTemplate(Number.parseInt(newTemplateId, 10))
                  }
                  hideCheckboxes
                  hideSelected
                  enableSearch
                  searchPlaceholder="Add template..."
                  onSearch={setAddTemplateSearch}
                />
              </div>

              <div class="templates">
                <For each={state.templates}>
                  {(template) => (
                    <div class="template">
                      <div class="name">{template.name}</div>
                      <div class="actions">
                        <button
                          title="remove"
                          class="action"
                          onClick={() => removeAccessRulesTemplate(template.id)}
                        >
                          <Icon name={"close"} wght={600} size={12} fill={1} />
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>

              <Show when={selectedExecutors().length > 0}>
                <Note type="secondary">
                  <Stack direction="column" spacing={"0.75em"}>
                    <Text variant="secondary" fontSize={"var(--text-sm)"}>
                      Create a new template from selected rules
                    </Text>
                    <Button
                      size="xs"
                      variant="primary"
                      color="blue"
                      leadingIcon="library_add"
                      onClick={createTemplateModal.setOpen}
                    >
                      Create template
                    </Button>
                  </Stack>
                </Note>
              </Show>
            </div>

            <div class="section">
              <div class="section-label">Custom rules</div>

              <Show
                when={state.executors.length === 0}
                fallback={
                  <Button
                    size="xs"
                    variant={"primary"}
                    leadingIcon={"add"}
                    onClick={toggleAvailableExecutorsOpen}
                    disabled={isAvailableExecutorsOpen()}
                  >
                    add executors
                  </Button>
                }
              >
                <Note type="secondary">
                  <Stack direction="column" spacing={"0.75em"}>
                    <Text variant="secondary" fontSize={"var(--text-sm)"}>
                      Select executors to define custom rules
                    </Text>
                    <Button
                      size="xs"
                      variant={"primary"}
                      color="blue"
                      leadingIcon={"add"}
                      onClick={toggleAvailableExecutorsOpen}
                      disabled={isAvailableExecutorsOpen()}
                    >
                      add executors
                    </Button>
                  </Stack>
                </Note>
              </Show>

              <div class="executors">
                <For each={state.executors}>
                  {(executor, executorIndex) => {
                    const selected = createMemo(() =>
                      selectedExecutors().includes(executor)
                    )

                    return (
                      <>
                        <div
                          classList={{
                            executor: true,
                            selected: selected(),
                          }}
                        >
                          <div class="executor-header">
                            <div class="executor-label">
                              <div class="icon">
                                <Switch>
                                  <Match
                                    when={executor.executorType === "user"}
                                  >
                                    <Icon
                                      name="person"
                                      wght={500}
                                      size={12}
                                      fill={1}
                                    />
                                  </Match>
                                  <Match
                                    when={
                                      executor.executorType === "user_group"
                                    }
                                  >
                                    <Icon
                                      name="group"
                                      wght={500}
                                      size={12}
                                      fill={1}
                                    />
                                  </Match>
                                </Switch>
                              </div>
                              <div class="name">{executor.executorName}</div>
                            </div>
                            <Show when={!props.readonly}>
                              <div class="buttons">
                                <button
                                  title="select"
                                  class="button select"
                                  onClick={() => selectExecutor(executor)}
                                >
                                  <Icon
                                    name={
                                      selected() ? "remove_selection" : "select"
                                    }
                                    wght={600}
                                    size={12}
                                    fill={1}
                                  />
                                </button>
                                <button
                                  title="remove"
                                  class="button"
                                  onClick={() =>
                                    removeExecutor(executorIndex())
                                  }
                                >
                                  <Icon
                                    name="close"
                                    wght={600}
                                    size={12}
                                    fill={1}
                                  />
                                </button>
                              </div>
                            </Show>
                          </div>
                          <div
                            classList={{
                              "executor-actions": true,
                              readonly: props.readonly,
                            }}
                          >
                            <Show when={props.entryType === "folder"}>
                              <StorageAccessSelectedExecutorAction
                                executorIndex={executorIndex()}
                                actionType="list_entries"
                                accessType={executor.actions.list_entries}
                                setState={setState}
                              />
                              <StorageAccessSelectedExecutorAction
                                executorIndex={executorIndex()}
                                actionType="upload"
                                accessType={executor.actions.upload}
                                setState={setState}
                              />
                            </Show>
                            <StorageAccessSelectedExecutorAction
                              executorIndex={executorIndex()}
                              actionType="download"
                              accessType={executor.actions.download}
                              setState={setState}
                            />
                            <StorageAccessSelectedExecutorAction
                              executorIndex={executorIndex()}
                              actionType="rename"
                              accessType={executor.actions.rename}
                              setState={setState}
                            />
                            <StorageAccessSelectedExecutorAction
                              executorIndex={executorIndex()}
                              actionType="move"
                              accessType={executor.actions.move}
                              setState={setState}
                            />
                            <StorageAccessSelectedExecutorAction
                              executorIndex={executorIndex()}
                              actionType="delete"
                              accessType={executor.actions.delete}
                              setState={setState}
                            />
                            <StorageAccessSelectedExecutorAction
                              executorIndex={executorIndex()}
                              actionType="manage_access"
                              accessType={executor.actions.manage_access}
                              setState={setState}
                            />
                          </div>
                        </div>
                      </>
                    )
                  }}
                </For>
              </div>
            </div>

            <Show when={!props.readonly}>
              <Stack direction="row" alignItems="center" spacing={"0.5em"}>
                <Button
                  title="Reset"
                  size="xs-squared"
                  variant="secondary"
                  leadingIcon="undo"
                  onClick={resetField}
                />

                <Button
                  width="100%"
                  size="xs"
                  variant="primary"
                  leadingIcon="save"
                  onClick={saveAccessRules}
                >
                  Save
                </Button>
              </Stack>
            </Show>
          </div>
        </Show>
        <div class="floating-container">
          <div class="available-access-entries-container">
            <div class="header">
              <Text fontWeight={500}>Add executors</Text>
            </div>

            <div class="search">
              <InputField
                width="100%"
                placeholder="Search..."
                inputProps={{
                  name: "executors-search",
                  autocomplete: "off",
                  value: executorsSearchFieldValue(),
                  onInput: (event) =>
                    setExecutorsSearchFieldValue(event.currentTarget.value),
                }}
              />
            </div>

            <Show when={userGroups().length === 0 && users().length === 0}>
              <Note type="secondary">
                <Text fontSize="var(--text-sm)" fontWeight={500}>
                  No results
                </Text>
              </Note>
            </Show>

            <Show when={userGroups().length > 0}>
              <div class="section">
                <div class="section-label">User groups</div>
                <div class="section-access-entries">
                  <For each={userGroups()}>
                    {(group) => {
                      return (
                        <StorageAccessAvailableExecutor
                          executorType="user_group"
                          executorId={group.id}
                          executorName={group.name}
                          selected={selectedGroupIds().includes(group.id)}
                          onSelect={(selected) =>
                            onSelectExecutor(
                              "user_group",
                              group.id,
                              group.name,
                              selected
                            )
                          }
                        />
                      )
                    }}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={users().length > 0}>
              <div class="section">
                <div class="section-label">Users</div>
                <div class="section-access-entries">
                  <For each={users()}>
                    {(user) => (
                      <StorageAccessAvailableExecutor
                        executorType="user"
                        executorId={user.id}
                        executorName={user.username}
                        selected={selectedUserIds().includes(user.id)}
                        onSelect={(selected) =>
                          onSelectExecutor(
                            "user",
                            user.id,
                            user.username,
                            selected
                          )
                        }
                      />
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Button
              size="sm"
              variant="secondary"
              onClick={toggleAvailableExecutorsOpen}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
