import { Component, Show, createSignal } from "solid-js"

import { createMutation, useQueryClient } from "@tanstack/solid-query"

import { Button } from "@/app/components/common/button/button"
import { Popup } from "@/app/components/common/popup/popup"
import { PopupContainer } from "@/app/components/common/popup/popup-container"
import { PopupEntry } from "@/app/components/common/popup/popup-entry"
import { logout } from "@/modules/core/auth/auth.api"
import { authKey, useAuth } from "@/modules/core/auth/auth.service"

export const UserIsland: Component = () => {
  const queryClient = useQueryClient()

  const $auth = useAuth()
  const $logout = createMutation(logout)

  const [popupShown, setPopupShown] = createSignal(false)

  const togglePopup = () => setPopupShown((shown) => !shown)

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
      <PopupContainer>
        <Button
          variant="secondary"
          width="100%"
          leadingIcon="person"
          onClick={togglePopup}
        >
          <div
            style={{
              "font-weight": 450,
            }}
          >
            {$auth.data?.username}
          </div>
        </Button>
        <Popup yPosition="top" xPosition="left" show={popupShown()}>
          <div class="popup-list">
            <PopupEntry onClick={performLogout}>Log out</PopupEntry>
          </div>
        </Popup>
      </PopupContainer>
    </Show>
  )
}
