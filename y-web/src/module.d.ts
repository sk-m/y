import { Component, JSX } from "solid-js"

type ComponentWithChildren<P = unknown> = Component<
  {
    children?: JSX.Element
  } & P
>
