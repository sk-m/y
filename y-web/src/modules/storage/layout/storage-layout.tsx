import { Component, lazy } from "solid-js"

import { Route, Routes } from "@solidjs/router"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"

const FileExplorerPage = lazy(
  async () => import("@/modules/storage/pages/file-explorer")
)

const StorageLayout: Component = () => {
  return (
    <>
      <AppAside>
        <AsideSection>
          <AsideEntry icon="cloud" title="Endpoint 1" to="1/browse" />
        </AsideSection>
      </AppAside>
      <AppContent>
        <Routes>
          <Route path=":endpointId/browse" component={FileExplorerPage} />
        </Routes>
      </AppContent>
    </>
  )
}

export default StorageLayout
