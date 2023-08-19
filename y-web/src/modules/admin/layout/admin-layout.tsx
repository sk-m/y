import { Component } from "solid-js"

import { Route, Routes } from "@solidjs/router"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"

export const AdminLayout: Component = () => {
  return (
    <>
      <AppAside>
        <AsideSection title="Administration">
          <AsideEntry icon="group" title="Users & Groups" to="users">
            <AsideEntry icon="person" title="Users" to="users/list" />
          </AsideEntry>
        </AsideSection>
      </AppAside>
      <AppContent>
        <Routes>
          <Route path={"/users/list"} />
        </Routes>
      </AppContent>
    </>
  )
}
