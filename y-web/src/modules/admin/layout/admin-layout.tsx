import { Component, lazy } from "solid-js"

import { Route, Routes } from "@solidjs/router"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"

import UserPage from "../pages/users/[userId]"

const UsersListPage = lazy(
  async () => import("@/modules/admin/pages/users-list")
)

const UserGroupsPage = lazy(
  async () => import("@/modules/admin/pages/user-groups")
)

const UserGroupPage = lazy(
  async () => import("@/modules/admin/pages/user-groups/[groupId]")
)

const NewUserGroupPage = lazy(
  async () => import("@/modules/admin/pages/user-groups/new")
)

const AdminLayout: Component = () => {
  return (
    <>
      <AppAside>
        <AsideSection>
          <AsideEntry icon="group" title="Users" to="users" />
          <AsideEntry icon="groups" title="Groups" to="user-groups" />
        </AsideSection>
      </AppAside>
      <AppContent>
        <Routes>
          <Route path="/users" component={UsersListPage} />
          <Route path="/user-groups" component={UserGroupsPage} />
          <Route path="/user-groups/new" component={NewUserGroupPage} />
          <Route path="/user-groups/:groupId" component={UserGroupPage} />
          <Route path="/users/:userId/*" component={UserPage} />
        </Routes>
      </AppContent>
    </>
  )
}

export default AdminLayout
