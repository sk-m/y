import { JSX } from "solid-js"

import { NavLink } from "@solidjs/router"

import { ComponentWithChildren } from "@/module"

import "./link.less"

export type LinkProps = {
  href: string
  variant?: "filled" | "text" | "text-secondary"

  style?: JSX.CSSProperties
}

export const Link: ComponentWithChildren<LinkProps> = (props) => {
  return (
    <NavLink
      href={props.href}
      classList={{
        "ui-link": true,
        [props.variant ?? "text"]: true,
      }}
      style={props.style}
    >
      {props.children}
    </NavLink>
  )
}
