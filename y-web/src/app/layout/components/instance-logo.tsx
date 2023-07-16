import { Component } from "solid-js"

export const InstanceLogo: Component = () => {
  return (
    <img
      style={{
        width: "42px",
        height: "42px",
        "object-fit": "contain",
        "user-select": "none",
      }}
      draggable={false}
      src="https://fakeimg.pl/48x48"
      alt="Logo"
    />
  )
}
