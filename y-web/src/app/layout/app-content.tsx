import { Component } from "solid-js"

import { AppRouter } from "@/app/app-router"

import "./app-content.less"

export const AppContent: Component = () => {
  return (
    <div id="app-content">
      <AppRouter />
    </div>
  )
}
