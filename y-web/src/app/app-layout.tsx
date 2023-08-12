import { Component, Show, createEffect } from "solid-js"

import { useNavigate } from "@solidjs/router"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AppMenubar } from "@/app/layout/app-menubar"
import { useAuth } from "@/modules/core/auth/auth.service"

import "./app-layout.less"
import { routes } from "./routes"

export const AppLayout: Component = () => {
  const navigate = useNavigate()

  const $auth = useAuth()

  createEffect(() => {
    if ($auth.isError) {
      navigate(routes["/login"])
    }
  })

  return (
    <Show when={$auth.isSuccess}>
      <div id="app-root">
        <AppMenubar />
        <div id="app-main">
          <AppAside />
          <AppContent />
        </div>
      </div>
    </Show>
  )
}
