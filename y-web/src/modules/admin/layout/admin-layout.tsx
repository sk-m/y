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

const NewUserPage = lazy(async () => import("@/modules/admin/pages/users/new"))

const UserGroupsPage = lazy(
  async () => import("@/modules/admin/pages/user-groups")
)

const UserGroupPage = lazy(
  async () => import("@/modules/admin/pages/user-groups/[groupId]")
)

const NewUserGroupPage = lazy(
  async () => import("@/modules/admin/pages/user-groups/new")
)

const FeaturesPage = lazy(async () => import("@/modules/admin/pages/features"))

const AdminLayout: Component = () => {
  return (
    <>
      <AppAside>
        <AsideSection>
          <AsideEntry
            icon="group"
            title="Users & Groups"
            to="users"
            relatedPaths={["users", "user-groups"]}
          >
            <AsideEntry subEntry icon="group" title="Users" to="users" />
            <AsideEntry
              subEntry
              icon="groups"
              title="Groups"
              to="user-groups"
            />
          </AsideEntry>
          <AsideEntry icon="settings" title="Instance config" to="config" />
          <AsideEntry icon="bolt" title="Features" to="features" />
        </AsideSection>
      </AppAside>
      <AppContent>
        <Routes>
          <Route path="/users" component={UsersListPage} />
          <Route path="/user-groups" component={UserGroupsPage} />
          <Route path="/user-groups/new" component={NewUserGroupPage} />
          <Route path="/user-groups/:groupId" component={UserGroupPage} />
          <Route path="/users/:userId/*" component={UserPage} />
          <Route path="/users/new" component={NewUserPage} />
          <Route path="/features" component={FeaturesPage} />
        </Routes>
      </AppContent>
    </>
  )
}

export default AdminLayout
