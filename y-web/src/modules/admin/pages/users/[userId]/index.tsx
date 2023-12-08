/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component, Show, createMemo } from "solid-js"

import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "@solidjs/router"
import { format } from "date-fns"

import { Card } from "@/app/components/common/card/card"
import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Tab, TabsContainer } from "@/app/components/common/tab/tab"
import { Text } from "@/app/components/common/text/text"
import { routes } from "@/app/routes"
import { useUser } from "@/modules/admin/user/user.service"

import UserGeneralSubpage from "./general"
import UserGroupsSubpage from "./groups"

const UserPage: Component = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  // eslint-disable-next-line no-confusing-arrow
  const userId = createMemo(() => params.userId as string)

  const $user = useUser(() => ({
    userId: userId(),
  }))

  const currentSubpage = createMemo(() => {
    const locationParts = location.pathname.split("/")

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return (locationParts.length > 3 && locationParts[4]) || "general"
  })

  const navigateToSubpage = (subpage: string) =>
    userId() && navigate(`${routes["/admin/users"]}/${userId()}/${subpage}`)

  return (
    <Container size="m">
      <Stack spacing="2em">
        <Show when={$user.data}>
          <Stack spacing={"0.5em"}>
            <Text variant="h2">{$user.data!.username}</Text>
            <Text variant="secondary" fontSize={"var(--text-sm)"}>
              Joined {format(new Date($user.data!.created_at), "dd.MM.yyyy")}
            </Text>
          </Stack>
        </Show>

        <Card>
          <TabsContainer>
            <Tab
              label="General"
              onClick={() => navigateToSubpage("")}
              selected={currentSubpage() === "general"}
            />
            <Tab
              label="Groups"
              selected={currentSubpage() === "groups"}
              onClick={() => navigateToSubpage("groups")}
            />
          </TabsContainer>
        </Card>

        <Show when={$user.data}>
          <Routes>
            <Route
              path="/"
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              element={<UserGeneralSubpage user={$user.data!} />}
            />
            <Route
              path="/groups"
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              element={<UserGroupsSubpage user={$user.data!} />}
            />
          </Routes>
        </Show>
      </Stack>
    </Container>
  )
}

export default UserPage
