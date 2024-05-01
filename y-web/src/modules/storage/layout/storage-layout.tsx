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
          <AsideEntry
            icon="explore"
            title="Browse"
            to={
              storageEndpoints()[0]
                ? `browse/${storageEndpoints()[0]!.id}`
                : "browse"
            }
            relatedPaths={["browse", "browse/*"]}
          >
            <For each={storageEndpoints()}>
              {(endpoint) => (
                <AsideEntry
                  subEntry
                  icon="folder_open"
                  title={endpoint.name}
                  to={`browse/${endpoint.id}`}
                />
              )}
            </For>
          </AsideEntry>
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
