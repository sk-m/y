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

const UsersListPage = lazy(async () => import("@/modules/admin/pages/users"))

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

const ConfigInstancePage = lazy(
  async () => import("@/modules/admin/pages/config/instance")
)

const ConfigStoragePage = lazy(
  async () => import("@/modules/admin/pages/config/storage")
)

const FeaturesPage = lazy(async () => import("@/modules/admin/pages/features"))

const AboutPage = lazy(async () => import("@/modules/admin/pages/about"))

const AdminLayout: Component = () => {
  const $auth = useAuth()
  const $features = useFeatures()

  const featuresPageAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "update_features"
      ) ?? false
  )

  const configPageAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "update_config"
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
              to="/admin/users"
              relatedPaths={["/admin/users", "/admin/user-groups"]}
            >
              <AsideEntry
                subEntry
                icon="group"
                title="Users"
                to="/admin/users"
              />
              <AsideEntry
                subEntry
                icon="groups"
                title="Groups"
                to="/admin/user-groups"
              />
            </AsideEntry>

            <Show when={configPageAllowed()}>
              <AsideEntry
                icon="page_info"
                title="Configuration"
                to="/admin/config/instance"
                relatedPaths={[
                  "/admin/config",
                  "/admin/config/instance",
                  "/admin/config/storage",
                ]}
              >
                <AsideEntry
                  subEntry
                  icon="home"
                  title="Instance"
                  to="/admin/config/instance"
                />
                <AsideEntry
                  subEntry
                  icon="hard_drive"
                  title="Storage"
                  to="/admin/config/storage"
                />
              </AsideEntry>
            </Show>

            <Show when={storagePageAllowed()}>
              <AsideEntry
                icon="hard_drive"
                title="Storage"
                to="/admin/storage/endpoints"
                relatedPaths={["/admin/storage", "/admin/storage/endpoints"]}
              >
                <AsideEntry
                  subEntry
                  icon="data_table"
                  title="Endpoints"
                  to="/admin/storage/endpoints"
                />
                <AsideEntry
                  subEntry
                  icon="contract"
                  title="Access Templates"
                  to="/admin/storage/access-templates"
                />
              </AsideEntry>
            </Show>

            <Show when={featuresPageAllowed()}>
              <AsideEntry icon="bolt" title="Features" to="/admin/features" />
            </Show>
          </AsideSection>

          <AsideSection>
            <AsideEntry icon="info" title="About" to="/admin/about" />
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
          <Route path="/config/instance" component={ConfigInstancePage} />
          <Route path="/config/storage" component={ConfigStoragePage} />
          <Route path="/storage/endpoints" component={StorageEndpointsPage} />
          <Route
            path="/storage/endpoints/:endpointId/*"
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
