import { Component } from "solid-js"

import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"

import { StorageAccessTemplatesList } from "./components/access-templates-table"

const StorageAccessTemplatesPage: Component = () => {
  return (
    <Container size="m">
      <Stack spacing={"2em"}>
        <Breadcrumbs>
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage"]}>Storage</Breadcrumb>
          <Breadcrumb path={routes["/admin/storage/access-templates"]}>
            Access Templates
          </Breadcrumb>
        </Breadcrumbs>

        <StorageAccessTemplatesList />
      </Stack>
    </Container>
  )
}

export default StorageAccessTemplatesPage
