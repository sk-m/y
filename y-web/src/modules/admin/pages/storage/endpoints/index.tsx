import { Component, createEffect, createMemo } from "solid-js"

import { useNavigate } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { useAuth } from "@/modules/core/auth/auth.service"

import { StorageEndpointsList } from "./components/storage-endpoints-list"

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

        <StorageEndpointsList />

        <Card>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing="1em"
          >
            <Stack spacing="1em">
              <Text
                variant="h3"
                style={{
                  margin: "0",
                }}
              >
                New storage endpoint
              </Text>
              <Text variant="secondary">
                Set up a new user storage endpoint.
              </Text>
            </Stack>
            <Button onClick={() => navigate("new")} leadingIcon="hard_drive">
              New endpoint
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  )
}

export default StorageEndpointsPage
