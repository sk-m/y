import { Component, Show, createMemo } from "solid-js"

import { useNavigate } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { AppErrorBoundary } from "@/app/layout/components/app-error-boundary"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { useAuth } from "@/modules/core/auth/auth.service"

import { UsersList } from "./components/users-lits"

const UsersListPage: Component = () => {
  const $auth = useAuth()
  const navigate = useNavigate()

  const userCreationAllowed = createMemo(() =>
    $auth.data?.user_rights.some(
      (right) => right.right_name === "create_account"
    )
  )

  return (
    <Container size="m">
      <Stack spacing={"2em"}>
        <Breadcrumbs>
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/users"]}>Users</Breadcrumb>
        </Breadcrumbs>

        <AppErrorBoundary message="Could not load users list">
          <UsersList />
        </AppErrorBoundary>

        <Show when={userCreationAllowed()}>
          <Card>
            <div
              style={{
                display: "flex",
                "justify-content": "space-between",
                "align-items": "center",
                gap: "1em",
              }}
            >
              <div class="ui-card-label">
                <div class="label-strip" />
                <Stack spacing={"0.33em"}>
                  <Text
                    variant="h3"
                    style={{
                      margin: "0",
                    }}
                  >
                    New user
                  </Text>
                  <Text variant="secondary" fontSize={"var(--text-sm)"}>
                    Manually create a new user account. You can set a temporary
                    password.
                  </Text>
                </Stack>
              </div>
              <Button
                leadingIcon="person_add"
                onClick={() => {
                  navigate(routes["/admin/users/new"])
                }}
              >
                Create user
              </Button>
            </div>
          </Card>
        </Show>
      </Stack>
    </Container>
  )
}

export default UsersListPage
