import { Component, Show, createMemo } from "solid-js"

import { useNavigate } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { useAuth } from "@/modules/core/auth/auth.service"

import { UserGroupsList } from "../../components/user-groups-lits"

const UserGroupsListPage: Component = () => {
  const $auth = useAuth()
  const navigate = useNavigate()

  const groupCreationAllowed = createMemo(() =>
    $auth.data?.user_rights.some(
      (right) =>
        right.right_name === "manage_user_groups" &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (right.right_options["allow_creating_user_groups"] as unknown) === true
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
      <UserGroupsList />

      <Show when={groupCreationAllowed()}>
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
                New user group
              </Text>
              <Text variant="secondary">Create a new user group.</Text>
            </Stack>
            <Button onClick={() => navigate("new")} leadingIcon="group_add">
              New group
            </Button>
          </Stack>
        </Card>
      </Show>
    </Container>
  )
}

export default UserGroupsListPage
