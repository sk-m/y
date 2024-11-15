import { Component, Show } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Icon } from "@/app/components/common/icon/icon"
import { Stack } from "@/app/components/common/stack/stack"
import { Text } from "@/app/components/common/text/text"
import { logout } from "@/modules/core/auth/auth.api"
import { authKey, useAuth } from "@/modules/core/auth/auth.service"

import "./user-island.less"

export const UserIsland: Component = () => {
  const queryClient = useQueryClient()

  const $auth = useAuth()
  const $logout = createMutation(logout)

  const performLogout = () => {
    // eslint-disable-next-line no-undefined
    $logout.mutate(undefined, {
      onSuccess: () => {
        void queryClient.invalidateQueries(authKey)
      },
    })
  }

  return (
    <Show when={$auth}>
      <Stack
        id="user-island"
        direction="row"
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={"0.33em"}>
          <button
            classList={{
              "user-notifications": true,
              new: false,
            }}
          >
            <Icon
              name="notifications"
              wght={500}
              size={18}
              fill={0}
              type="sharp"
            />
            <div class="red-dot" />
          </button>
          <Text
            fontWeight={500}
            style={{
              padding: "0 0.5em",
              "word-break": "break-all",
            }}
          >
            {$auth.data?.username}
          </Text>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={"0.5em"}>
          {/* <button class="button" title="User settings">
            <Icon
              name="settings"
              wght={500}
              size={16}
              fill={1}
              type="rounded"
            />
          </button> */}

          <button class="button logout" onClick={performLogout} title="Log out">
            <Icon name="logout" wght={500} size={16} fill={1} type="rounded" />
          </button>
        </Stack>
      </Stack>
    </Show>
  )
}
