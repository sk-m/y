import { Component, Show, createEffect, createMemo } from "solid-js"

import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "@solidjs/router"

import { Container } from "@/app/components/common/layout/container"
import { Stack } from "@/app/components/common/stack/stack"
import { Tab, TabContent, TabsContainer } from "@/app/components/common/tab/tab"
import { Text } from "@/app/components/common/text/text"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { useUser } from "@/modules/admin/user/user.service"
import { useAuth } from "@/modules/core/auth/auth.service"

import UserGeneralSubpage from "./general"
import UserGroupsSubpage from "./groups"

const USERS_LIST_ROUTE = routes["/admin/users"]

const UserPage: Component = () => {
  const $auth = useAuth()

  const allowedTabs = createMemo(() => {
    const groupsTabAllowed = $auth.data?.user_rights.some(
      (right) => right.right_name === "manage_user_groups"
    )

    return { groupsTabAllowed }
  })

  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  // eslint-disable-next-line no-confusing-arrow
  const userId = createMemo(() => params.userId as string)

  const $user = useUser(() => ({
    userId: userId(),
  }))

  createEffect(() => {
    if ($user.isError) {
      genericErrorToast($user.error)
      navigate(USERS_LIST_ROUTE)
    }
  })

  const currentSubpage = createMemo(() => {
    const locationParts = location.pathname.split("/")

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return (locationParts.length > 3 && locationParts[4]) || "general"
  })

  const navigateToSubpage = (subpage: string) =>
    userId() && navigate(`${USERS_LIST_ROUTE}/${userId()}/${subpage}`)

  return (
    <Container size="m">
      <Breadcrumbs
        style={{
          "margin-bottom": "1em",
        }}
      >
        <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
        <Breadcrumb path={USERS_LIST_ROUTE}>Users</Breadcrumb>
        <Breadcrumb path={`${USERS_LIST_ROUTE}/${userId()}`}>
          {$user.data?.username ?? ""}
        </Breadcrumb>
      </Breadcrumbs>

      <Stack spacing="1.5em">
        <Show when={$user.data}>
          <Text variant="h2">{$user.data!.username}</Text>
        </Show>

        <Stack>
          <TabsContainer>
            <Tab
              label="General"
              onClick={() => navigateToSubpage("")}
              selected={currentSubpage() === "general"}
            />
            <Show when={allowedTabs().groupsTabAllowed}>
              <Tab
                label="User groups"
                selected={currentSubpage() === "groups"}
                onClick={() => navigateToSubpage("groups")}
              />
            </Show>
          </TabsContainer>

          <Show when={$user.data}>
            <TabContent>
              <Routes>
                <Route
                  path="/"
                  element={<UserGeneralSubpage user={$user.data!} />}
                />
                <Show when={allowedTabs().groupsTabAllowed}>
                  <Route
                    path="/groups"
                    element={<UserGroupsSubpage user={$user.data!} />}
                  />
                </Show>
              </Routes>
            </TabContent>
          </Show>
        </Stack>
      </Stack>
    </Container>
  )
}

export default UserPage
