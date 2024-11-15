import { Component, For, Show, createEffect, createMemo } from "solid-js"

import { Link, useNavigate } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Icon } from "@/app/components/common/icon/icon"
import { Container } from "@/app/components/common/layout/container"
import { Note } from "@/app/components/common/note/note"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { AppErrorBoundary } from "@/app/layout/components/app-error-boundary"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { useStorageEndpoints } from "@/modules/admin/storage/storage-endpoint/storage-endpoint.service"
import { useAuth } from "@/modules/core/auth/auth.service"

import "./endpoints-page.less"

const endpointStatusSortingWeight = {
  active: 2,
  read_only: 1,
  disabled: 0,
} as const

const EndpointsList: Component = () => {
  const $storageEndpoints = useStorageEndpoints(() => ({}), {
    refetchOnWindowFocus: true,
    useErrorBoundary: true,
  })

  const endpoints = createMemo(
    () =>
      $storageEndpoints.data?.storage_endpoints.sort(
        (a, b) =>
          endpointStatusSortingWeight[b.status] -
          endpointStatusSortingWeight[a.status]
      ) ?? []
  )

  return (
    <Show
      when={endpoints().length > 0}
      fallback={
        <Note type="secondary" fontSize="var(--text-sm)">
          No storage endpoints defined. Create a new one to start.
        </Note>
      }
    >
      <Stack spacing="1em">
        <Text variant="h3">Storage endpoints</Text>

        <div class="endpoint-cards-container">
          <For each={endpoints()}>
            {(endpoint) => (
              <div class="endpoint-container">
                <Link class="endpoint" href={`${endpoint.id}`}>
                  <div class="header">
                    <div class="icon">
                      <Icon
                        fill={0}
                        type="rounded"
                        name="hard_drive"
                        wght={500}
                      />

                      <div
                        classList={{
                          "status-dot": true,
                          active: endpoint.status === "active",
                          readonly: endpoint.status === "read_only",
                          disabled: endpoint.status === "disabled",
                        }}
                      />
                    </div>

                    <div class="endpoint-name">
                      <div>{endpoint.name}</div>
                    </div>
                  </div>

                  <div class="pills">
                    <Show when={endpoint.access_rules_enabled}>
                      <Pill variant="success">access rules</Pill>
                    </Show>
                  </div>

                  <div class="main-info">
                    <div class="endpoint-subtext">
                      <Text variant="secondary" fontSize={"var(--text-sm)"}>
                        {endpoint.description}
                      </Text>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </For>
        </div>
      </Stack>
    </Show>
  )
}

const StorageEndpointsPage: Component = () => {
  const $auth = useAuth()
  const navigate = useNavigate()

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

  return (
    <Container size="m">
      <Stack spacing={"2em"}>
        <Breadcrumbs>
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage"]}>Storage</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage/endpoints"]}>
            Endpoints
          </Breadcrumb>
        </Breadcrumbs>

        <AppErrorBoundary message="Could not load endpoints list">
          <EndpointsList />
        </AppErrorBoundary>

        <Card>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing="1em"
          >
            <div class="ui-card-label">
              <div class="label-strip" />
              <Stack spacing="0.33em">
                <Text
                  variant="h3"
                  style={{
                    margin: "0",
                  }}
                >
                  New endpoint
                </Text>
                <Text variant="secondary" fontSize={"var(--text-sm)"}>
                  Set up a new storage endpoint.
                </Text>
              </Stack>
            </div>

            <Button onClick={() => navigate("new")} leadingIcon="library_add">
              Create endpoint
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}

export default StorageEndpointsPage
