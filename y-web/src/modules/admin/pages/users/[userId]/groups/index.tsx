import { Component, For, createMemo, createSignal } from "solid-js"

import { useParams } from "@solidjs/router"
import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Card } from "@/app/components/common/card/card"
import { Checkbox } from "@/app/components/common/checkbox/checkbox"
import { Icon } from "@/app/components/common/icon/icon"
import { Link } from "@/app/components/common/link/link"
import { Modal } from "@/app/components/common/modal/modal"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { toastCtl } from "@/app/core/toast"
import { genericErrorToast } from "@/app/core/util/toast-utils"
import { routes } from "@/app/routes"
import { useUserGroups } from "@/modules/admin/user-groups/user-groups.service"
import { updateUserGroupMembership } from "@/modules/admin/user/user.api"
import { IUser } from "@/modules/admin/user/user.codecs"
import { authKey, useAuth } from "@/modules/core/auth/auth.service"

import "./user-groups-subpage.less"

export type UserGroupsSubpageProps = {
  user: IUser
}

const UserGroupsSubpage: Component<UserGroupsSubpageProps> = (props) => {
  const $auth = useAuth()

  const params = useParams()
  const queryClient = useQueryClient()
  const { notify } = toastCtl

  const $updateUserGroupMembership = createMutation(updateUserGroupMembership)

  const clientPermissions = createMemo(() => {
    let allowedGroups: number[] = []
    let anyGroupIsAllowed = false

    for (const right of $auth.data?.user_rights ?? []) {
      if (right.right_name === "assign_user_groups") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (right.right_options["allow_assigning_any_group"] === true) {
          anyGroupIsAllowed = true
        }

        const allowedGroupsIds =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          right.right_options?.["assignable_user_groups"] as
            | number[]
            | undefined

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (allowedGroupsIds && Array.isArray(allowedGroupsIds)) {
          allowedGroups = [...allowedGroups, ...allowedGroupsIds]
        }
      }
    }

    return { allowedGroups, anyGroupIsAllowed }
  })

  const $userGroups = useUserGroups(() => ({}))
  const userGroups = createMemo(
    () =>
      $userGroups.data?.user_groups.filter((group) => !group.group_type) ?? []
  )

  const [confirmationModalOpen, setConfirmationModalOpen] = createSignal(false)
  const [selectedGroups, setSelectedGroups] = createSignal<number[]>(
    // eslint-disable-next-line solid/reactivity
    props.user.user_groups
  )

  const updateSelection = (groupId: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedGroups((groups) => [...groups, groupId])
    } else {
      setSelectedGroups((groups) => groups.filter((id) => id !== groupId))
    }
  }

  const saveGroups = () => {
    if (params.userId) {
      $updateUserGroupMembership.mutate(
        {
          userId: Number.parseInt(params.userId, 10),
          userGroups: selectedGroups(),
        },
        {
          onSettled: () => {
            setConfirmationModalOpen(false)
          },
          onSuccess: () => {
            notify({
              title: "Changes saved",
              content: "User's group membership was updated",
              severity: "success",
              icon: "check",
            })

            void queryClient.invalidateQueries(["user", params.userId])

            if ($auth.data?.id === Number.parseInt(params.userId ?? "", 10)) {
              void queryClient.invalidateQueries(authKey)
            }
          },
          onError: (error) => genericErrorToast(error),
        }
      )
    }
  }

  return (
    <>
      <Modal
        open={confirmationModalOpen()}
        keepMounted
        onClose={() => setConfirmationModalOpen(false)}
        style={{
          "max-width": "450px",
        }}
        header={
          <Stack spacing={"1.5em"} direction="row" alignItems="center">
            <div
              style={{
                display: "flex",
                "align-items": "center",
                "justify-content": "center",

                padding: "1em",

                "background-color": "var(--color-border-15)",
                "border-radius": "15px",
              }}
            >
              <Icon grad={25} wght={500} size={24} name="warning" />
            </div>
            <Stack spacing="0.5em">
              <Text
                variant="h2"
                style={{
                  margin: 0,
                }}
                color="var(--color-text-grey-025)"
              >
                Confirm changes
              </Text>
            </Stack>
          </Stack>
        }
      >
        <Stack spacing={"1.5em"}>
          <Text>
            Are you sure you want to commit your changes to this user's groups?
          </Text>

          <Stack direction="row" justifyContent="space-between">
            <Button
              variant="secondary"
              onClick={() => setConfirmationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={$updateUserGroupMembership.isLoading}
              onClick={saveGroups}
            >
              {$updateUserGroupMembership.isLoading ? "Saving..." : "Confirm"}
            </Button>
          </Stack>
        </Stack>
      </Modal>
      <Stack id="page-user-groups-subpage">
        <Card>
          <Stack spacing="1.5em">
            <div class="ui-card-label">
              <div class="label-strip" />
              <Stack spacing={"0.33em"}>
                <Text
                  variant="h3"
                  style={{
                    margin: "0",
                  }}
                >
                  Group membership
                </Text>
              </Stack>
            </div>

            <Stack spacing="0.33em">
              <For each={userGroups()}>
                {(userGroup) => {
                  const isSelected = createMemo(() =>
                    selectedGroups().includes(userGroup.id)
                  )

                  const isMutable = createMemo(
                    () =>
                      clientPermissions().anyGroupIsAllowed ||
                      clientPermissions().allowedGroups.includes(userGroup.id)
                  )

                  return (
                    <div
                      classList={{
                        "group-option": true,
                        disabled: !isMutable(),
                        selected: isSelected(),
                      }}
                    >
                      <Checkbox
                        size="m"
                        value={isSelected()}
                        onChange={(checked) =>
                          updateSelection(userGroup.id, checked)
                        }
                        disabled={!isMutable()}
                      />
                      <Link
                        variant="text-secondary"
                        href={`${routes["/admin/user-groups"]}/${userGroup.id}`}
                        style={{
                          color: "var(--color-text)",
                        }}
                      >
                        <Text fontWeight={480}>{userGroup.name}</Text>
                      </Link>
                    </div>
                  )
                }}
              </For>
            </Stack>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={"2em"}
            >
              <Text variant="secondary" fontSize={"var(--text-sm)"}>
                User's permissions will be recalculated immediately after
                saving.
              </Text>

              <Button
                variant="primary"
                onClick={() => setConfirmationModalOpen(true)}
              >
                Save changes
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </>
  )
}

export default UserGroupsSubpage
