import { Component } from "solid-js"

import { AppRouter } from "@/app/app-router"

export const AppContent: Component = () => {
  return (
    <div id="app-content">
      <AppRouter />
    </div>
  )
}
