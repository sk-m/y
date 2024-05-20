import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js"
import { SetStoreFunction, createStore, produce } from "solid-js/store"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Icon } from "@/app/components/common/icon/icon"
import { Note } from "@/app/components/common/note/note"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { useUserGroups } from "@/modules/admin/user-groups/user-groups.service"

import { createStorageAccessRules } from "../storage-access-rule/storage-access-rule.api"
import {
  IStorageAccessRule,
  IStorageAccessRuleAccessType,
  IStorageAccessRuleActionType,
  IStorageAccessRuleExecutorType,
} from "../storage-access-rule/storage-access-rule.codecs"
import { storageEntryAccessRulesKey } from "../storage-access-rule/storage-access-rule.service"
import { useStorageEndpoints } from "../storage-endpoint/storage-endpoint.service"
import "./storage-access-field.less"

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
          type="checkbox"
          checked={props.selected}
          onChange={(event) => props.onSelect(event.currentTarget.checked)}
        />
      </div>
      <div class="executor">
        <div class="icon">
          <Icon
            name={props.executorType === "user" ? "user" : "group"}
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

  const $storageEndpoints = useStorageEndpoints()

  const areAccessRulesEnforced = createMemo(
    () =>
      $storageEndpoints.data?.endpoints.find(
        (endpoint) => endpoint.id === props.endpointId
      )?.access_rules_enabled ?? false
  )

  // eslint-disable-next-line solid/reactivity
  const [state, setState] = createStore<StorageEntryAccessSettings>(props.value)

  const [isAvailableExecutorsOpen, setIsAvailableExecutorsOpen] =
    createSignal(false)
  const [isFieldExpanded, setIsFieldExpanded] = createSignal(true)

  const toggleAvailableExecutorsOpen = () =>
    setIsAvailableExecutorsOpen((value) => !value)
  const toggleFieldExpanded = () => setIsFieldExpanded((value) => !value)

  const $createStorageAccessRules = createMutation(createStorageAccessRules)
  const $userGroups = useUserGroups(() => ({}))

  const userGroups = createMemo(() => $userGroups.data?.user_groups ?? [])

  const selectedGroupIds = createMemo(() =>
    state.executors
      .filter((executor) => executor.executorType === "user_group")
      .map((executor) => executor.executorId)
  )

  createEffect(() => {
    setState("executors", props.value.executors)
  })

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
        entryType: props.entryType,
        entryId: props.entryId,

        rules,
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries([
            storageEntryAccessRulesKey,
            props.endpointId,
            props.entryType,
            props.entryId,
          ])

          notify({
            title: "Saved",
            content: "Access rules saved",
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

  return (
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

      <Stack
        style={{
          padding: "0 0.75em 0.75em 0.75em",
        }}
      >
        <Show when={!areAccessRulesEnforced()}>
          <Note
            type="critical"
            fontSize="var(--text-sm)"
            style={{
              "font-weight": 500,
            }}
          >
            Access rules are disabled
          </Note>
        </Show>
      </Stack>

      <Show when={isFieldExpanded()}>
        <div class="value">
          <Show
            when={state.executors.length > 0}
            fallback={
              <div class="message">
                <Text
                  variant="secondary"
                  fontWeight={500}
                  fontSize={"var(--text-sm)"}
                >
                  No rules defined
                </Text>
              </div>
            }
          >
            <div class="executors">
              <For each={state.executors}>
                {(executor, executorIndex) => (
                  <>
                    <div class="executor">
                      <div class="executor-header-hint">
                        executor {executorIndex() + 1}
                      </div>
                      <div class="executor-header">
                        <div class="executor-label">
                          <div class="icon">
                            <Switch>
                              <Match when={executor.executorType === "user"}>
                                <Icon
                                  name="user"
                                  wght={500}
                                  size={12}
                                  fill={1}
                                />
                              </Match>
                              <Match
                                when={executor.executorType === "user_group"}
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
                              class="button"
                              onClick={() => removeExecutor(executorIndex())}
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
                )}
              </For>
            </div>
          </Show>

          <Show when={!props.readonly}>
            <div class="buttons">
              <Stack direction="row" spacing={"0.75em"}>
                <Button
                  width="100%"
                  size="xs"
                  variant="secondary"
                  leadingIcon="add"
                  onClick={toggleAvailableExecutorsOpen}
                />
                <Button
                  width="100%"
                  size="xs"
                  variant="secondary"
                  leadingIcon="save"
                  onClick={saveAccessRules}
                />
              </Stack>
            </div>
          </Show>
        </div>
      </Show>
      <div class="floating-container">
        <div class="available-access-entries-container">
          <div class="section">
            <div class="section-label">User groups</div>
            <div class="section-access-entries">
              <For each={userGroups()}>
                {(group) => (
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
                )}
              </For>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
