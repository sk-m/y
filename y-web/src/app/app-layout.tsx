import { Component } from "solid-js"

import { AppAside } from "@/app/layout/app-aside"
import { AppContent } from "@/app/layout/app-content"
import { AppMenubar } from "@/app/layout/app-menubar"

import "./app-layout.less"

export const AppLayout: Component = () => {
  return (
    <div id="app-root">
      <AppMenubar />
      <div id="app-main">
        <AppAside />
        <AppContent />
      </div>
    </div>
  )
}
