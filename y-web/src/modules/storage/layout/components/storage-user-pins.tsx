import { Component, For, createSignal } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import {
  ContextMenu,
  ContextMenuLink,
  ContextMenuSection,
} from "@/app/components/context-menu/context-menu"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { useContextMenu } from "@/app/core/util/use-context-menu"
import { AsideEntry } from "@/app/layout/components/aside-entry"

import { deleteStorageUserPin } from "../../storage-user-pin/storage-user-pin.api"
import { IStorageUserPin } from "../../storage-user-pin/storage-user-pin.codecs"
import { storageUserPinsKey } from "../../storage-user-pin/storage-user-pin.service"

export type StorageUserPinsProps = {
  userPins: IStorageUserPin[]
}

export const StorageUserPins: Component<StorageUserPinsProps> = (props) => {
  const { notify } = toastCtl
  const queryClient = useQueryClient()

  const $deleteStorageUserPin = createMutation(deleteStorageUserPin)

  const [contextMenuTargetPin, setContextMenuTargetPin] =
    createSignal<IStorageUserPin | null>(null)

  const {
    open: openContextMenu,
    close: closeContextMenu,
    contextMenuProps: contextMenuProps,
  } = useContextMenu({
    onClose: () => {
      setContextMenuTargetPin(null)
    },
  })

  const deleteSelectedPin = () => {
    if (contextMenuTargetPin()?.pin_id) {
      $deleteStorageUserPin.mutate(
        {
          pinId: contextMenuTargetPin()!.pin_id,
        },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries([storageUserPinsKey])

            notify({
              title: "Unpinned",
              icon: "keep_off",
              severity: "success",
            })
          },
          onError: (error) => genericErrorToast(error),
        }
      )
    }
  }

  return (
    <>
      <ContextMenu {...contextMenuProps()}>
        <ContextMenuSection>
          <Stack
            style={{
              padding: "0.5em 1.5em",
            }}
            spacing={"0.25em"}
          >
            <Text
              fontWeight={500}
              fontSize="var(--text-sm)"
              color="var(--color-text-grey-05)"
            >
              Pinned folder
            </Text>
            <Text
              variant="secondary"
              fontSize="var(--text-sm)"
              fontWeight={450}
              style={{
                "max-width": "20em",
                "word-break": "break-all",
              }}
            >
              {contextMenuTargetPin()?.name ?? ""}
            </Text>
          </Stack>

          <div class="separator" />

          <ContextMenuLink
            icon="keep_off"
            onClick={() => {
              deleteSelectedPin()
              closeContextMenu()
            }}
          >
            Unpin
          </ContextMenuLink>
        </ContextMenuSection>
      </ContextMenu>

      <For each={props.userPins}>
        {(userPin) => (
          <AsideEntry
            small
            exact
            icon="keep"
            title={userPin.name}
            to={`/files/browse/${userPin.endpoint_id}/${userPin.entry_id}`}
            relatedPaths={[
              `/files/browse/${userPin.endpoint_id}/${userPin.entry_id}`,
            ]}
            linkProps={{
              onContextMenu: (event) => {
                event.preventDefault()

                setContextMenuTargetPin(userPin)
                openContextMenu(event)
              },
            }}
          />
        )}
      </For>
    </>
  )
}
