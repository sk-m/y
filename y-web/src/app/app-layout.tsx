import { Component, Show, createEffect, lazy } from "solid-js"

import { Route, Routes, useNavigate } from "@solidjs/router"

import { useAuth } from "@/modules/core/auth/auth.service"

import "./app-layout.less"
import { routes } from "./routes"

const HomeLayout = lazy(async () => import("@/modules/home/layout/home-layout"))

const AdminLayout = lazy(
  async () => import("@/modules/admin/layout/admin-layout")
)

const StorageLayout = lazy(
  async () => import("@/modules/storage/layout/storage-layout")
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
        <div id="app-main">
          <Routes>
            <Route path="/" component={HomeLayout} />
            <Route path="/admin/*" component={AdminLayout} />
            <Route path="/files/*" component={StorageLayout} />
          </Routes>
        </div>
      </div>
    </Show>
  )
}
