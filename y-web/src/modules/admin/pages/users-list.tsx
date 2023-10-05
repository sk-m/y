/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component } from "solid-js"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Container } from "@/app/components/common/layout/container"
import { Text } from "@/app/components/common/text/text"

import { UsersList } from "../components/users-lits"

const UsersListPage: Component = () => {
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
          <Button leadingIcon="person_add">New user</Button>
        </div>
      </Card>
    </Container>
  )
}

export default UsersListPage
