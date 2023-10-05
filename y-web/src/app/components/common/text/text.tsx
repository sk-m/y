import { JSX, Match, Switch, createMemo } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./text.less"

export type TextProps = {
  variant?: "h1" | "h2" | "h3" | "body" | "body2" | "secondary"
  fontWeight?: JSX.CSSProperties["font-weight"]
  textAlign?: JSX.CSSProperties["text-align"]
  monospace?: boolean

  style?: JSX.CSSProperties
}

export const Text: ComponentWithChildren<TextProps> = (props) => {
  const componentProps = createMemo(() => {
    return {
      style: {
        "font-weight": props.fontWeight,
        "text-align": props.textAlign,

        ...(props.monospace && {
          // eslint-disable-next-line @typescript-eslint/quotes
          "font-family": '"SourceCodePro", monospace',
          "font-weight": 450,
        }),

        ...props.style,
      } as JSX.CSSProperties,
    }
  })

  return (
    <Switch
      fallback={
        <div class="ui-text" {...componentProps()}>
          {props.children}
        </div>
      }
    >
      <Match when={props.variant === "h1"}>
        <h1 class="ui-text" {...componentProps()}>
          {props.children}
        </h1>
      </Match>
      <Match when={props.variant === "h2"}>
        <h2 class="ui-text" {...componentProps()}>
          {props.children}
        </h2>
      </Match>
      <Match when={props.variant === "h3"}>
        <h3 class="ui-text" {...componentProps()}>
          {props.children}
        </h3>
      </Match>
      <Match when={props.variant === "body2"}>
        <div class="ui-text body2" {...componentProps()}>
          {props.children}
        </div>
      </Match>
      <Match when={props.variant === "secondary"}>
        <div class="ui-text secondary" {...componentProps()}>
          {props.children}
        </div>
      </Match>
    </Switch>
  )
}
