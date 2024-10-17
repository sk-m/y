import { Component, Show, createMemo, lazy } from "solid-js"

import { Route, Routes } from "@solidjs/router"

import { Stack } from "@/app/components/common/stack/stack"
import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AsideEntry } from "@/app/layout/components/aside-entry"
import { AsideSection } from "@/app/layout/components/aside-section"
import { useAuth } from "@/modules/core/auth/auth.service"

import { useFeatures } from "../feature/feature.service"
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

const StorageEndpointsPage = lazy(
  async () => import("@/modules/admin/pages/storage/endpoints")
)

const NewStorageEndpointPage = lazy(
  async () => import("@/modules/admin/pages/storage/endpoints/new")
)

const StorageEndpointPage = lazy(
  async () => import("@/modules/admin/pages/storage/endpoints/[endpointId]")
)

const StorageAccessTemplatesPage = lazy(
  async () => import("@/modules/admin/pages/storage/access-templates")
)

const AboutPage = lazy(async () => import("@/modules/admin/pages/about"))

const FeaturesPage = lazy(async () => import("@/modules/admin/pages/features"))

const AdminLayout: Component = () => {
  const $auth = useAuth()
  const $features = useFeatures()

  const featuresPageAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "update_features"
      ) ?? false
  )

  const storagePageAllowed = createMemo(
    () =>
      $features.data?.features.some(
        (feature) => feature.feature === "storage" && feature.enabled
      ) ?? false
  )

  return (
    <>
      <AppAside>
        <Stack
          style={{
            height: "100%",
          }}
          justifyContent="space-between"
        >
          <AsideSection>
            <AsideEntry
              icon="person"
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

            {/* <AsideEntry
              icon="page_info"
              title="Configuration"
              to="config/general"
              relatedPaths={["config", "config/general"]}
            >
              <AsideEntry
                subEntry
                icon="manufacturing"
                title="Genral"
                to="config/general"
              />
            </AsideEntry> */}

            <Show when={storagePageAllowed()}>
              <AsideEntry
                icon="hard_drive"
                title="Storage"
                to="storage/endpoints"
                relatedPaths={["storage", "storage/endpoints"]}
              >
                <AsideEntry
                  subEntry
                  icon="data_table"
                  title="Endpoints"
                  to="storage/endpoints"
                />
                <AsideEntry
                  subEntry
                  icon="contract"
                  title="Access Templates"
                  to="storage/access-templates"
                />
              </AsideEntry>
            </Show>

            <Show when={featuresPageAllowed()}>
              <AsideEntry icon="bolt" title="Features" to="features" />
            </Show>
          </AsideSection>

          <AsideSection>
            <AsideEntry icon="info" title="About" to="about" />
          </AsideSection>
        </Stack>
      </AppAside>
      <AppContent>
        <Routes>
          <Route path="/users" component={UsersListPage} />
          <Route path="/user-groups" component={UserGroupsPage} />
          <Route path="/user-groups/new" component={NewUserGroupPage} />
          <Route path="/user-groups/:groupId/*" component={UserGroupPage} />
          <Route path="/users/:userId/*" component={UserPage} />
          <Route path="/users/new" component={NewUserPage} />
          <Route path="/features" component={FeaturesPage} />
          <Route path="/storage/endpoints" component={StorageEndpointsPage} />
          <Route
            path="/storage/endpoints/:endpointId"
            component={StorageEndpointPage}
          />
          <Route
            path="/storage/endpoints/new"
            component={NewStorageEndpointPage}
          />
          <Route
            path="/storage/access-templates"
            component={StorageAccessTemplatesPage}
          />
          <Route path="/about" component={AboutPage} />
        </Routes>
      </AppContent>
    </>
  )
}

export default AdminLayout
