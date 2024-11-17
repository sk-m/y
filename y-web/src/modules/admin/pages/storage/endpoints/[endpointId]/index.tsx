/* eslint-disable sonarjs/no-duplicate-string */
import { Show, createEffect, createMemo } from "solid-js"

import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "@solidjs/router"

import { Container } from "@/app/components/common/layout/container"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"
import { Tab, TabContent, TabsContainer } from "@/app/components/common/tab/tab"
import { Text } from "@/app/components/common/text/text"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { useStorageEndpoint } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"
import { useAuth } from "@/modules/core/auth/auth.service"

import { StorageEndpointStatusPill } from "../components/storage-endpoint-status-pill"
import { StorageEndpointTypePill } from "../components/storage-endpoint-type-pill"
import StorageEndpointGeneralSubpage from "./general"
import StorageEndpointVFSSubpage from "./vfs"

const StorageEndpointPage = () => {
  const $auth = useAuth()
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const endpointId = createMemo(() => params.endpointId as string)

  const $storageEndpoint = useStorageEndpoint(
    () => ({
      endpointId: endpointId(),
    }),
    {
      useErrorBoundary: true,
    }
  )

  const endpointsAccessAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "manage_storage_endpoints"
      ) ?? false
  )

  createEffect(() => {
    if ($auth.isFetched && !endpointsAccessAllowed()) {
      throw new Error("Access denied")
    }
  })

  const currentSubpage = createMemo(() => {
    const locationParts = location.pathname.split("/")

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return (locationParts.length > 4 && locationParts[5]) || "general"
  })

  const navigateToSubpage = (subpage: string) =>
    endpointId() &&
    navigate(`${routes["/admin/storage/endpoints"]}/${endpointId()}/${subpage}`)

  return (
    <Container size="m">
      <Show when={$storageEndpoint.data}>
        <Breadcrumbs
          style={{
            "margin-bottom": "1em",
          }}
        >
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage"]}>Storage</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage/endpoints"]}>
            Endpoints
          </Breadcrumb>
          <Breadcrumb
            path={`${routes["/admin/storage/endpoints"]}/${endpointId()}`}
          >
            {$storageEndpoint.data?.name ?? ""}
          </Breadcrumb>
        </Breadcrumbs>

        <Stack spacing={"1.5em"}>
          <Stack spacing={"0.5em"}>
            <Text variant="h2">{$storageEndpoint.data!.name}</Text>
            <Stack direction="row" spacing={"0.5em"}>
              <StorageEndpointStatusPill
                status={$storageEndpoint.data!.status}
              />
              <StorageEndpointTypePill
                type={$storageEndpoint.data!.endpoint_type}
              />
              <Show when={$storageEndpoint.data!.access_rules_enabled}>
                <Pill variant="success">access rules</Pill>
              </Show>
            </Stack>
          </Stack>

          <Stack>
            <TabsContainer>
              <Tab
                label="General"
                onClick={() => navigateToSubpage("")}
                selected={currentSubpage() === "general"}
              />
              <Tab
                label="VFS"
                onClick={() => navigateToSubpage("vfs")}
                selected={currentSubpage() === "vfs"}
              />
            </TabsContainer>

            <TabContent>
              <Routes>
                <Route
                  path="/"
                  element={
                    <StorageEndpointGeneralSubpage
                      endpoint={$storageEndpoint.data!}
                    />
                  }
                />
                <Route
                  path="/vfs"
                  element={
                    <StorageEndpointVFSSubpage
                      endpoint={$storageEndpoint.data!}
                    />
                  }
                />
              </Routes>
            </TabContent>
          </Stack>
        </Stack>
      </Show>
    </Container>
  )
}

export default StorageEndpointPage
