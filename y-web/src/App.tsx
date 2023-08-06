import type { Component } from "solid-js"

import { Route, Router, Routes } from "@solidjs/router"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"

import { AppLayout } from "@/app/app-layout"
import LoginPage from "@/modules/core/pages/login/login"

const queryClient = new QueryClient()

const App: Component = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" component={LoginPage} />
          <Route path="/*" component={AppLayout} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App
