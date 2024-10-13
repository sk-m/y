/* eslint-disable sonarjs/no-duplicate-string */
import {
  Component,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
} from "solid-js"

import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "@solidjs/router"

import { Icon } from "@/app/components/common/icon/icon"
import { Container } from "@/app/components/common/layout/container"
import { Pill } from "@/app/components/common/pill/pill"
import { Stack } from "@/app/components/common/stack/stack"
import { Tab, TabContent, TabsContainer } from "@/app/components/common/tab/tab"
import { Text } from "@/app/components/common/text/text"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { Breadcrumb, Breadcrumbs } from "@/app/layout/components/breadcrumbs"
import { routes } from "@/app/routes"
import { userGroupType } from "@/modules/admin/user-groups/user-groups.codecs"
import { useUserGroup } from "@/modules/admin/user-groups/user-groups.service"
import { useAuth } from "@/modules/core/auth/auth.service"

import UserGroupGeneralSubpage from "./general"
import UserGroupRightsSubpage from "./rights"

const USER_GROUPS_ROUTE = routes["/admin/user-groups"]

const UserGroupPage: Component = () => {
  const $auth = useAuth()

  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const groupId = createMemo(() => params.groupId as string)

  const groupManagementPermissions = createMemo(() => {
    let groupManagementAllowed = false
    let groupDeletionAllowed = false

    for (const right of $auth.data?.user_rights ?? []) {
      if (right.right_name === "manage_user_groups") {
        groupManagementAllowed = true

        if (
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (right.right_options?.["allow_deleting_user_groups"] as unknown) ===
          true
        ) {
          groupDeletionAllowed = true
          break
        }
      }
    }

    return { groupManagementAllowed, groupDeletionAllowed }
  })

  const $userGroup = useUserGroup(() => ({
    userGroupId: Number.parseInt(params.groupId!, 10),
  }))

  const isNonSystemGroup = createMemo(() => !$userGroup.data?.group_type)

  createEffect(() => {
    if ($userGroup.isError) {
      genericErrorToast($userGroup.error)
      navigate(USER_GROUPS_ROUTE)
    }
  })

  const currentSubpage = createMemo(() => {
    const locationParts = location.pathname.split("/")

    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    return (locationParts.length > 3 && locationParts[4]) || "general"
  })

  const navigateToSubpage = (subpage: string, replace = false) =>
    groupId() &&
    navigate(`${USER_GROUPS_ROUTE}/${groupId()}/${subpage}`, {
      replace,
    })

  createEffect(() => {
    if (!isNonSystemGroup() && currentSubpage() === "general") {
      navigateToSubpage("rights", true)
    }
  })

  return (
    <Show when={$userGroup.data}>
      <Container size="m">
        <Breadcrumbs
          style={{
            "margin-bottom": "1em",
          }}
        >
          <Breadcrumb path={routes["/admin"]}>Administration</Breadcrumb>
          <Breadcrumb path={USER_GROUPS_ROUTE}>Groups</Breadcrumb>
          <Breadcrumb path={`${USER_GROUPS_ROUTE}/${$userGroup.data!.id}`}>
            {$userGroup.data!.name}
          </Breadcrumb>
        </Breadcrumbs>

        <Stack spacing="1.5em">
          <Stack spacing={"0.5em"}>
            <Text variant="h2">{$userGroup.data?.name ?? ""}</Text>

            <Switch>
              <Match
                when={$userGroup.data?.group_type === userGroupType.everyone}
              >
                <Text fontSize={"var(--text-sm)"}>
                  <Pill>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={"0.25em"}
                    >
                      <Icon name="settings" size={12} wght={500} />
                      <span>System group</span>
                    </Stack>
                  </Pill>
                </Text>
              </Match>
              <Match when={$userGroup.data?.group_type === userGroupType.user}>
                <Text fontSize={"var(--text-sm)"}>
                  <Pill>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={"0.25em"}
                    >
                      <Icon name="settings" size={12} wght={500} />
                      <span>System group</span>
                    </Stack>
                  </Pill>
                </Text>
              </Match>
            </Switch>
          </Stack>

          <Stack>
            <TabsContainer>
              <Show when={isNonSystemGroup()}>
                <Tab
                  label="General"
                  onClick={() => navigateToSubpage("")}
                  selected={currentSubpage() === "general"}
                />
              </Show>
              <Tab
                label="Rights"
                selected={currentSubpage() === "rights"}
                onClick={() => navigateToSubpage("rights")}
              />
            </TabsContainer>
          </Stack>
        </Stack>

        <TabContent>
          <Show when={$userGroup.data}>
            <Routes>
              <Route
                path="/"
                element={
                  <UserGroupGeneralSubpage
                    group={$userGroup.data!}
                    groupManagementAllowed={
                      groupManagementPermissions().groupManagementAllowed
                    }
                    groupDeletionAllowed={
                      groupManagementPermissions().groupDeletionAllowed
                    }
                  />
                }
              />
              <Route
                path="/rights"
                element={
                  <UserGroupRightsSubpage
                    group={$userGroup.data!}
                    groupManagementAllowed={
                      groupManagementPermissions().groupManagementAllowed
                    }
                  />
                }
              />
            </Routes>
          </Show>
        </TabContent>
      </Container>
    </Show>
  )
}

export default UserGroupPage
