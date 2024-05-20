import { Component, For, Show, createEffect, createMemo } from "solid-js"

import { Link, useNavigate } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Icon } from "@/app/components/common/icon/icon"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
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

const StorageEndpointsPage: Component = () => {
  const $auth = useAuth()
  const navigate = useNavigate()

  const endpointsAccessAllowed = createMemo(
    () =>
      $auth.data?.user_rights.some(
        (right) => right.right_name === "manage_storage_endpoints"
      ) ?? false
  )

  const $storageEndpoints = useStorageEndpoints(() => ({}), {
    refetchOnWindowFocus: true,
  })

  const endpoints = createMemo(
    () =>
      $storageEndpoints.data?.storage_endpoints.sort(
        (a, b) =>
          endpointStatusSortingWeight[b.status] -
          endpointStatusSortingWeight[a.status]
      ) ?? []
  )

  createEffect(() => {
    if ($auth.isFetched && !endpointsAccessAllowed()) {
      navigate(routes["/admin/storage"])
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

        <Show when={endpoints().length > 0}>
          <Stack spacing="1em">
            <Text variant="h3">Storage endpoints</Text>

            <div class="endpoint-cards-container">
              <For each={endpoints()}>
                {(endpoint) => (
                  <Link class="endpoint" href={`${endpoint.id}`}>
                    <div class="icon">
                      <Icon fill={1} type="rounded" name="hard_drive" />

                      <div
                        classList={{
                          "status-dot": true,
                          active: endpoint.status === "active",
                          readonly: endpoint.status === "read_only",
                          disabled: endpoint.status === "disabled",
                        }}
                      />
                    </div>
                    <div class="main-info">
                      <div class="endpoint-name">{endpoint.name}</div>
                      <div class="endpoint-description">
                        <Text variant="secondary" fontSize={"var(--text-sm)"}>
                          {endpoint.description}
                        </Text>
                      </div>
                    </div>
                  </Link>
                )}
              </For>
            </div>
          </Stack>
        </Show>

        {/* <StorageEndpointsList /> */}

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

            <Button onClick={() => navigate("new")} leadingIcon="add_circle">
              Create endpoint
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}

export default StorageEndpointsPage
