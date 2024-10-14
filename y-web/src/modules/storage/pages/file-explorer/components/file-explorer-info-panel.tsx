import { Component, Show, createMemo } from "solid-js"

import { format } from "date-fns"

import {
  KeyValue,
  KeyValueFields,
} from "@/app/components/common/key-value/key-value"
import { formatBytes } from "@/app/core/format-utils"
import { useUser } from "@/modules/admin/user/user.service"
import { useAuth } from "@/modules/core/auth/auth.service"
import {
  StorageAccessField,
  StorageEntryAccessActions,
  StorageEntryExecutor,
} from "@/modules/storage/components/storage-access-field"
import { useStorageEntryAccessRules } from "@/modules/storage/storage-access-rule/storage-access-rule.service"
import { IStorageEntry } from "@/modules/storage/storage-entry/storage-entry.codecs"

import "./file-explorer-info-panel.less"

export type FileExplorerInfoPanelProps = {
  endpointId: number
  entry: IStorageEntry
  thumbnails?: Record<number, string>

  onRename?: (newName: string) => void
  onThumbnailClick?: () => void
}

export const FileExplorerInfoPanel: Component<FileExplorerInfoPanelProps> = (
  props
) => {
  const $auth = useAuth()

  const storageAccessManagementAllowed = createMemo(() =>
    $auth.data?.user_rights.some(
      (right) => right.right_name === "storage_manage_access"
    )
  )

  // prettier-ignore
  const thumbnail = createMemo(() =>
    (props.entry.entry_type === "file"
      ? props.thumbnails?.[props.entry.id]
      : null)
  )

  // TODO is this a good idea?
  const createdBy = createMemo(() => {
    if (props.entry.created_by === null) return null

    const $createdBy = useUser(() => ({
      userId: props.entry.created_by!,
    }))

    return $createdBy.data
  })

  const $entryAccessRules = useStorageEntryAccessRules(() => ({
    endpointId: props.endpointId,
    entryId: props.entry.id,
  }))

  const entryAccessRulesSettings = createMemo(() => {
    const rules = $entryAccessRules.data?.rules ?? []
    const executors: Record<number, StorageEntryExecutor> = {}

    if (rules.length === 0) return { executors: [] }

    for (const rule of rules) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (executors[rule.executor_id]?.actions) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        executors[rule.executor_id]!.actions[rule.action] = rule.access_type
      } else {
        executors[rule.executor_id] = {
          executorId: rule.executor_id,
          executorType: rule.executor_type,
          executorName: rule.executor_name ?? rule.executor_id.toString(),
          actions: {
            [rule.action]: rule.access_type,
          } as StorageEntryAccessActions,
        }
      }
    }

    return {
      executors: Object.values(executors),
    }
  })

  return (
    <div class="file-explorer-info-panel">
      <Show when={thumbnail()}>
        <div
          class="thumbnail-container"
          onClick={() => {
            props.onThumbnailClick?.()
          }}
        >
          <img
            draggable={false}
            class="thumbnail"
            src={`data:image/jpeg;base64, ${thumbnail() ?? ""}`}
          />
        </div>
      </Show>

      <div class="key-values">
        <KeyValueFields>
          <KeyValue
            direction="column"
            label="Name"
            value={props.entry.name}
            onChange={(value) => props.onRename?.(value)}
          />
          <Show when={props.entry.mime_type}>
            <KeyValue
              direction="column"
              label="MIME Type"
              readonly
              value={props.entry.mime_type}
              onChange={() => void 0}
            />
          </Show>
          <Show when={props.entry.size_bytes}>
            <KeyValue
              direction="column"
              label="Size"
              readonly
              value={formatBytes(props.entry.size_bytes!)}
              onChange={() => void 0}
            />
          </Show>
          <KeyValue
            direction="column"
            label="Created by"
            readonly
            value={createdBy()?.username ?? "-"}
            onChange={() => void 0}
          />
          <Show when={props.entry.created_at}>
            <KeyValue
              direction="column"
              label="Created at"
              readonly
              value={props.entry.created_at}
              getValueString={(value) =>
                format(new Date(value!), "dd.MM.yyyy HH:mm")
              }
              onChange={() => void 0}
            />
          </Show>

          <StorageAccessField
            endpointId={props.endpointId}
            entryId={props.entry.id}
            entryType={props.entry.entry_type}
            value={entryAccessRulesSettings()}
            readonly={!storageAccessManagementAllowed()}
          />
        </KeyValueFields>
      </div>
    </div>
  )
}
