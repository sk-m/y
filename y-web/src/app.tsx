import type { Component } from "solid-js"

import { Route, Router, Routes } from "@solidjs/router"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"

import { AppLayout } from "@/app/app-layout"
import LoginPage from "@/modules/core/pages/login/login"

import { AppToasts } from "./app/layout/app-toasts"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      keepPreviousData: true,

      retry: false,

      refetchInterval: false,
      refetchOnWindowFocus: false,
    },
  },
})

const App: Component = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div id="app-modals-container" />
      <Router>
        <Routes>
          <Route path="/login" component={LoginPage} />
          <Route path="/*" component={AppLayout} />
        </Routes>
      </Router>
      <AppToasts />
    </QueryClientProvider>
  )
}

export default App
