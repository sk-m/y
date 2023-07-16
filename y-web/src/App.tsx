import type { Component } from "solid-js"

import { Route, Router, Routes } from "@solidjs/router"

import { AppLayout } from "@/app/app-layout"

const App: Component = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" />
        <Route path="/*" component={AppLayout} />
      </Routes>
    </Router>
  )
}

export default App
