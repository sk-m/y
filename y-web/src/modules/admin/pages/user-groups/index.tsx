import { Component } from "solid-js"

import { useNavigate } from "@solidjs/router"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"

import { UserGroupsList } from "../../components/user-groups-lits"

const UserGroupsListPage: Component = () => {
  const navigate = useNavigate()

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
    </Container>
  )
}

export default UserGroupsListPage
