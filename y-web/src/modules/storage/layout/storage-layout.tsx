import { Component, For, createMemo, lazy } from "solid-js"

import { Route, Routes } from "@solidjs/router"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"

import { useStorageEndpoints } from "../storage-endpoint/storage-endpoint.service"

const FileExplorerPage = lazy(
  async () => import("@/modules/storage/pages/file-explorer")
)

const StorageLayout: Component = () => {
  const $storageEndpoints = useStorageEndpoints()
  const storageEndpoints = createMemo(
    () => $storageEndpoints.data?.endpoints ?? []
  )

  return (
    <>
      <AppAside>
        <AsideSection>
          <For each={storageEndpoints()}>
            {(endpoint) => (
              <AsideEntry
                icon="cloud"
                title={endpoint.name}
                to={`browse/${endpoint.id}`}
              />
            )}
          </For>
        </AsideSection>
      </AppAside>
      <AppContent>
        <Routes>
          <Route path="browse/:endpointId" component={FileExplorerPage} />
        </Routes>
      </AppContent>
    </>
  )
}

export default StorageLayout
