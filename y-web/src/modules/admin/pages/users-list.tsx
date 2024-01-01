/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component, Show, createMemo } from "solid-js"

import { useNavigate } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Container } from "@/app/components/common/layout/container"
import { Text } from "@/app/components/common/text/text"
import { routes } from "@/app/routes"
import { useAuth } from "@/modules/core/auth/auth.service"

import { UsersList } from "../components/users-lits"

const UsersListPage: Component = () => {
  const $auth = useAuth()
  const navigate = useNavigate()

  const userCreationAllowed = createMemo(() =>
    $auth.data?.user_rights.some(
      (right) => right.right_name === "create_account"
    )
  )

  return (
    <Container
      size="m"
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "2em",
      }}
    >
      <UsersList />

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
            <div
              style={{
                display: "flex",
                "flex-direction": "column",
                gap: "1em",
              }}
            >
              <Text
                variant="h3"
                style={{
                  margin: "0",
                }}
              >
                New user
              </Text>
              <Text variant="secondary">
                Manually create a new user account. You can set a temporary
                password.
              </Text>
            </div>
            <Button
              leadingIcon="person_add"
              onClick={() => {
                navigate(routes["/admin/users/new"])
              }}
            >
              New user
            </Button>
          </div>
        </Card>
      </Show>
    </Container>
  )
}

export default UsersListPage
