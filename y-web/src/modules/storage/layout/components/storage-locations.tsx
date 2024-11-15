import { Component, For, createMemo, createSignal } from "solid-js"

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
import { useAuth } from "@/modules/core/auth/auth.service"

import { deleteStorageLocation } from "../../storage-location/storage-location.api"
import { IStorageLocation } from "../../storage-location/storage-location.codecs"
import { storageLocationsKey } from "../../storage-location/storage-location.service"

export type StorageLocationsProps = {
  locations: IStorageLocation[]
}

export const StorageLocations: Component<StorageLocationsProps> = (props) => {
  const $auth = useAuth()
  const { notify } = toastCtl
  const queryClient = useQueryClient()

  const $deleteStorageLocation = createMutation(deleteStorageLocation)

  const [contextMenuTargetLocation, setContextMenuTargetLocation] =
    createSignal<IStorageLocation | null>(null)

  const {
    open: openContextMenu,
    close: closeContextMenu,
    contextMenuProps: contextMenuProps,
  } = useContextMenu({
    onClose: () => {
      setContextMenuTargetLocation(null)
    },
  })

  const deleteAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "manage_storage_locations"
      ) ?? false
  )

  const deleteSelectedLocation = () => {
    if (contextMenuTargetLocation()?.id) {
      $deleteStorageLocation.mutate(
        {
          locationId: contextMenuTargetLocation()!.id,
        },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries([storageLocationsKey])

            notify({
              title: "Removed",
              content: "Location removed from sidebar",
              icon: "check",
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
              Location
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
              {contextMenuTargetLocation()?.name ?? ""}
            </Text>
          </Stack>

          <div class="separator" />

          <ContextMenuLink
            icon="delete"
            onClick={() => {
              deleteSelectedLocation()
              closeContextMenu()
            }}
          >
            Remove
          </ContextMenuLink>
        </ContextMenuSection>
      </ContextMenu>

      <For each={props.locations}>
        {(location) => (
          <AsideEntry
            small
            exact
            icon="folder_open"
            title={location.name}
            to={`/files/browse/${location.endpoint_id}/${location.entry_id}`}
            relatedPaths={[
              `/files/browse/${location.endpoint_id}/${location.entry_id}`,
            ]}
            linkProps={{
              onContextMenu: (event) => {
                event.preventDefault()

                if (deleteAllowed()) {
                  setContextMenuTargetLocation(location)
                  openContextMenu(event)
                }
              },
            }}
          />
        )}
      </For>
    </>
  )
}
