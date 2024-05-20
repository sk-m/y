import { Component, onMount } from "solid-js"

import { useNavigate } from "@solidjs/router"

const HomeLayout: Component = () => {
  const navigate = useNavigate()

  onMount(() => {
    navigate("/admin")
  })

  return <></>
}

export default HomeLayout
