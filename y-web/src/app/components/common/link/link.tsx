import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./link.less"

export type LinkProps = {
  href: string
  variant?: "filled" | "text" | "text-secondary"

  style?: JSX.CSSProperties
}

export const Link: ComponentWithChildren<LinkProps> = (props) => {
  return (
    <a
      href={props.href}
      classList={{
        "ui-link": true,
        [props.variant ?? "text"]: true,
      }}
      style={props.style}
    >
      {props.children}
    </a>
  )
}
