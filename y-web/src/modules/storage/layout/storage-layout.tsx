/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Component, For, Show, createMemo, lazy } from "solid-js"

import { Route, Routes } from "@solidjs/router"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"
import { useAuth } from "@/modules/core/auth/auth.service"

import { useStorageEndpoints } from "../storage-endpoint/storage-endpoint.service"
import { useStorageLocations } from "../storage-location/storage-location.service"
import { StorageLocations } from "./components/storage-locations"

const FileExplorerPage = lazy(
  async () => import("@/modules/storage/pages/file-explorer")
)

const StorageLayout: Component = () => {
  const $auth = useAuth()

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

  const $storageEndpoints = useStorageEndpoints()
  const storageEndpoints = createMemo(
    () => $storageEndpoints.data?.endpoints ?? []
  )

  return (
    <>
      <AppAside>
        <AsideSection>
          <Show when={storageLocations().length > 0}>
            <div class="aside-section-title">Locations</div>

            <StorageLocations locations={storageLocations()} />
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
                    to={`browse/${endpoint.id}`}
                  />
                ) : null
              }}
            </For>
          </Show>
        </AsideSection>
      </AppAside>
      <AppContent noShadows>
        <Routes>
          <Route path="browse/:endpointId" component={FileExplorerPage} />
        </Routes>
      </AppContent>
    </>
  )
}

export default StorageLayout
