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
      const keyUpHandler = (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          props.onCreate(newFolderNameInputRef!.value)
          newFolderNameInputRef!.value = ""
        }

        if (event.key === "Escape") {
          newFolderNameInputRef!.value = ""
          props.onClose()
        }
      }

      const blurHandler = () => {
        newFolderNameInputRef!.value = ""
        props.onClose()
      }

      newFolderNameInputRef.addEventListener("keyup", keyUpHandler)
      newFolderNameInputRef.addEventListener("blur", blurHandler)

      onCleanup(() => {
        newFolderNameInputRef?.removeEventListener("keyup", keyUpHandler)
        newFolderNameInputRef?.removeEventListener("blur", blurHandler)
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
