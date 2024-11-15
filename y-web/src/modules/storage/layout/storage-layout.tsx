/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Component, For, Show, createMemo, lazy } from "solid-js"

import { Route, Routes } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"

import { Note } from "@/app/components/common/note/note"
import { toastCtl } from "@/app/core/toast"
import { websocketCtl } from "@/app/core/websocket"
import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"
import { useAuth } from "@/modules/core/auth/auth.service"

import { useStorageEndpoints } from "../storage-endpoint/storage-endpoint.service"
import { useStorageLocations } from "../storage-location/storage-location.service"
import {
  storageUserArchivesKey,
  useStorageUserArchives,
} from "../storage-user-archive/storage-user-archive.service"
import { useStorageUserPins } from "../storage-user-pin/storage-user-pin.service"
import { StorageLocations } from "./components/storage-locations"
import { StorageUserArchives } from "./components/storage-user-archives"
import { StorageUserPins } from "./components/storage-user-pins"
import "./storage-layout.less"

const FileExplorerPage = lazy(
  async () => import("@/modules/storage/pages/file-explorer")
)

const StorageLayout: Component = () => {
  const { onMessage: onWsMessage } = websocketCtl
  const $auth = useAuth()
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  const storageEndpointsWithRootAccess = createMemo(() => {
    const storageRootAccess = $auth.data?.user_rights.find(
      (right) => right.right_name === "storage_root_access"
    )

    if (storageRootAccess?.right_options["allow_any_endpoint"] === true)
      return [true, []] as [boolean, number[]]

    if (storageRootAccess?.right_options["accessible_endpoints"]?.length > 0) {
      return [
        false,
        storageRootAccess!.right_options["accessible_endpoints"],
      ] as [boolean, number[]]
    }

    return [false, []] as [boolean, number[]]
  })

  const $storageLocations = useStorageLocations()
  const storageLocations = createMemo(
    () => $storageLocations.data?.locations ?? []
  )

  const $storageUserPins = useStorageUserPins()
  const storageUserPins = createMemo(
    () => $storageUserPins.data?.user_pins ?? []
  )

  const $storageUserArchives = useStorageUserArchives()
  const storageUserArchives = createMemo(
    () => $storageUserArchives.data?.user_archives ?? []
  )

  const $storageEndpoints = useStorageEndpoints()
  const storageEndpoints = createMemo(
    () => $storageEndpoints.data?.endpoints ?? []
  )

  onWsMessage((message) => {
    if (message.type === "storage_user_archive_status_updated") {
      void queryClient.invalidateQueries([storageUserArchivesKey])

      notify({
        title: "Archive ready",
        content: "Your archive is now ready to download",
        icon: "folder_zip",
        severity: "info",
        duration: 60_000,
      })
    }
  })

  return (
    <>
      <AppAside>
        <AsideSection>
          <Show when={storageLocations().length > 0}>
            <div class="aside-section-title">Locations</div>

            <StorageLocations locations={storageLocations()} />
          </Show>

          <div class="aside-section-title">Pinned</div>

          <Show
            when={storageUserPins().length > 0}
            fallback={
              <Note
                type="secondary"
                fontSize="var(--text-sm)"
                style={{
                  "font-weight": 480,
                  color: "var(--color-text-grey-1)",
                }}
              >
                You don't have any pins yet
              </Note>
            }
          >
            <StorageUserPins userPins={storageUserPins()} />
          </Show>

          <Show
            when={
              storageEndpointsWithRootAccess()[0] ||
              storageEndpointsWithRootAccess()[1].length > 0
            }
          >
            <div class="aside-section-title">Endpoints</div>
            <For each={storageEndpoints()}>
              {(endpoint) => {
                return storageEndpointsWithRootAccess()[0] ||
                  storageEndpointsWithRootAccess()[1].includes(endpoint.id) ? (
                  <AsideEntry
                    small
                    icon="hard_drive"
                    title={endpoint.name}
                    to={`/files/browse/${endpoint.id}`}
                  />
                ) : null
              }}
            </For>
          </Show>
        </AsideSection>
        <AsideSection>
          <StorageUserArchives userArchives={storageUserArchives()} />
        </AsideSection>
      </AppAside>
      <AppContent noShadows>
        <Routes>
          <Route
            path={["browse/:endpointId/:folderId", "browse/:endpointId"]}
            component={FileExplorerPage}
          />
        </Routes>
      </AppContent>
    </>
  )
}

export default StorageLayout
