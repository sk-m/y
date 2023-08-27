/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component } from "solid-js"

import { Button } from "@/app/components/common/button/button"
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
        gap: "1em",
      }}
    >
      <div
        style={{
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
        }}
      >
        <Text variant="h1">Users</Text>
        <Button leadingIcon="person_add">New user</Button>
      </div>

      <UsersList />
    </Container>
  )
}

export default UsersListPage
