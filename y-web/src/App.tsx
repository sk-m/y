import type { Component } from "solid-js"

import { Route, Router, Routes } from "@solidjs/router"

import { AppLayout } from "@/app/app-layout"
import LoginPage from "@/modules/core/pages/login/login"

const App: Component = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" component={LoginPage} />
        <Route path="/*" component={AppLayout} />
      </Routes>
    </Router>
  )
}

export default App
