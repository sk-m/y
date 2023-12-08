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
import { routes } from "@/app/routes"
import { useUserGroups } from "@/modules/admin/user-groups/user-groups.service"
import { updateUserGroupMembership } from "@/modules/admin/user/user.api"
import { IUser } from "@/modules/admin/user/user.codecs"

import "./user-groups-subpage.less"

export type UserGroupsSubpageProps = {
  user: IUser
}

const UserGroupsSubpage: Component<UserGroupsSubpageProps> = (props) => {
  const params = useParams()
  const queryClient = useQueryClient()

  const $updateUserGroupMembership = createMutation(updateUserGroupMembership)

  const $userGroups = useUserGroups(() => ({}))
  const userGroups = createMemo(() => $userGroups.data?.user_groups ?? [])

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
            void queryClient.invalidateQueries(["user", params.userId])
          },
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

          <Stack
            direction="row"
            justifyContent="space-between"
            style={{
              "margin-top": "1.5em",
            }}
          >
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
      <Stack spacing={"2em"} id="page-user-groups-subpage">
        <Stack spacing="0.33em">
          <For each={userGroups()}>
            {(userGroup) => {
              const selected = createMemo(() =>
                selectedGroups().includes(userGroup.id)
              )

              return (
                <div
                  classList={{
                    "group-option": true,
                    selected: selected(),
                  }}
                >
                  <Checkbox
                    size="m"
                    value={selected()}
                    onChange={(checked) =>
                      updateSelection(userGroup.id, checked)
                    }
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

        <Card>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={"2em"}
          >
            <Text variant="secondary">
              User's permissions will be updated immediately after saving.
            </Text>
            <Button
              variant="primary"
              onClick={() => setConfirmationModalOpen(true)}
            >
              Save groups
            </Button>
          </Stack>
        </Card>
      </Stack>
    </>
  )
}

export default UserGroupsSubpage
