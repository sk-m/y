import { Component, Show, createEffect, lazy } from "solid-js"

import { Route, Routes, useNavigate } from "@solidjs/router"

import { useAuth } from "@/modules/core/auth/auth.service"

import "./app-layout.less"
// import bkgV1 from "./layout/assets/bkg-dots.svg"
import bkgV2 from "./layout/assets/bkg-pattern.jpg"
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
          {/* <div
            class="app-bkg-pattern"
            style={{
              "background-image": `url(${bkgV1})`,
              opacity: 0.03,
              "background-size": "300px",
            }}
          /> */}
          <div
            class="app-bkg-pattern"
            style={{
              "background-image": `url(${bkgV2})`,
              "background-size": "300px",
              opacity: 0.125,
            }}
          />
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
