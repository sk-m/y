import { Component, Show } from "solid-js"

import { useAuth } from "@/modules/core/auth/auth.service"

export const UserIsland: Component = () => {
  const $auth = useAuth()

  return (
    <Show when={$auth}>
      <div
        style={{
          "font-weight": 500,
        }}
      >
        {$auth.data?.username}
      </div>
    </Show>
  )
}
