import { Component, Show, createEffect, lazy } from "solid-js"

import { Route, Routes, useNavigate } from "@solidjs/router"

import { AppMenubar } from "@/app/layout/app-menubar"
import { useAuth } from "@/modules/core/auth/auth.service"

import "./app-layout.less"
import { routes } from "./routes"

const AdminLayout = lazy(
  async () => import("@/modules/admin/layout/admin-layout")
)

export const AppLayout: Component = () => {
  const navigate = useNavigate()

  const $auth = useAuth()

  createEffect(() => {
    if ($auth.isError && !($auth.isFetching || $auth.isRefetching)) {
      navigate(`${routes["/login"]}?return=${window.location.pathname}`)
    }
  })

  return (
    <Show when={$auth.isSuccess}>
      <div id="app-root">
        <AppMenubar />
        <div id="app-main">
          <Routes>
            <Route path="/" />
            <Route path="/admin/*" component={AdminLayout} />
          </Routes>
        </div>
      </div>
    </Show>
  )
}
