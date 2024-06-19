import { Component, createEffect, onCleanup, onMount } from "solid-js"

import { Icon } from "@/app/components/common/icon/icon"

export type NewFolderEntryProps = {
  show: boolean
  endpointId: number
  folderId?: number

  onCreate: (folderName: string) => void
  onClose: () => void
}

export const NewFolderEntry: Component<NewFolderEntryProps> = (props) => {
  let newFolderNameInputRef: HTMLInputElement | undefined

  createEffect(() => {
    if (props.show) {
      newFolderNameInputRef?.focus()
    }
  })

  onMount(() => {
    if (newFolderNameInputRef) {
      const handler = (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          props.onCreate(newFolderNameInputRef!.value)
          newFolderNameInputRef!.value = ""
        }
      }

      newFolderNameInputRef.addEventListener("keyup", handler)

      onCleanup(() => {
        newFolderNameInputRef?.removeEventListener("keyup", handler)
      })
    }
  })

  return (
    <div
      class="item"
      hidden={!props.show}
      onClick={() => props.onClose()}
      title="Click to cancel"
    >
      <div class="item-thumb">
        <div class="icon">
          <Icon
            name={"create_new_folder"}
            type="outlined"
            fill={1}
            wght={500}
            size={40}
          />
        </div>
      </div>
      <div class="item-info">
        <div class="item-name">
          <input
            ref={(ref) => (newFolderNameInputRef = ref)}
            type="text"
            name="new-folder-name"
            class="name-input"
          />
        </div>
      </div>
    </div>
  )
}
