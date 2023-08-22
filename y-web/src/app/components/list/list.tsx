import { JSX } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./list.less"

export const ListHead: ComponentWithChildren<
  JSX.HTMLAttributes<HTMLDivElement>
> = (props) => {
  return (
    <div class="list-head" {...props}>
      {props.children}
    </div>
  )
}

export const ListEntries: ComponentWithChildren<
  JSX.HTMLAttributes<HTMLDivElement>
> = (props) => {
  return (
    <div class="list-entries" {...props}>
      {props.children}
    </div>
  )
}

export const ListFooter: ComponentWithChildren<
  JSX.HTMLAttributes<HTMLDivElement>
> = (props) => {
  return (
    <div class="list-footer" {...props}>
      {props.children}
    </div>
  )
}

export const List: ComponentWithChildren = (props) => {
  return (
    <div
      classList={{
        "ui-list-container": true,
      }}
    >
      {props.children}
    </div>
  )
}
