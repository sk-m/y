import { Component, lazy } from "solid-js"

import { Route, Routes } from "@solidjs/router"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"

const UsersListPage = lazy(
  async () => import("@/modules/admin/pages/users-list")
)

const AdminLayout: Component = () => {
  return (
    <>
      <AppAside>
        <AsideSection>
          <AsideEntry icon="group" title="Users" to="users" />
          <AsideEntry icon="groups" title="Groups" to="groups" />
        </AsideSection>
      </AppAside>
      <AppContent>
        <Routes>
          <Route path="/users" component={UsersListPage} />
        </Routes>
      </AppContent>
    </>
  )
}

export default AdminLayout
