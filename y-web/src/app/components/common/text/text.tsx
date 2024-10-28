import { JSX, Match, Switch, createMemo } from "solid-js"

import { ComponentWithChildren } from "@/module"

import "./text.less"

export type TextProps = {
  variant?: "h1" | "h2" | "h3" | "body" | "body2" | "secondary"
  fontWeight?: JSX.CSSProperties["font-weight"]
  fontSize?: JSX.CSSProperties["font-size"]
  textAlign?: JSX.CSSProperties["text-align"]
  color?: JSX.CSSProperties["color"]
  monospace?: boolean
  container?: "text" | "pill"
  italic?: boolean

  style?: JSX.CSSProperties
}

export const Text: ComponentWithChildren<TextProps> = (props) => {
  const componentProps = createMemo(() => {
    return {
      style: {
        "font-weight": props.fontWeight,
        "text-align": props.textAlign,

        ...(props.color && {
          color: props.color,
        }),

        ...(props.fontSize && {
          "font-size": props.fontSize,
        }),

        ...(props.monospace && {
          // eslint-disable-next-line @typescript-eslint/quotes
          "font-family": '"SourceCodePro", monospace',
          "font-weight": 450,
        }),

        ...props.style,
      } as JSX.CSSProperties,
    }
  })

  const classList = createMemo(() => ({
    "ui-text": true,
    italic: props.italic,
    pill: props.container === "pill",
  }))

  return (
    <Switch
      fallback={
        <div classList={classList()} {...componentProps()}>
          {props.children}
        </div>
      }
    >
      <Match when={props.variant === "h1"}>
        <h1 classList={classList()} {...componentProps()}>
          {props.children}
        </h1>
      </Match>
      <Match when={props.variant === "h2"}>
        <h2 classList={classList()} {...componentProps()}>
          {props.children}
        </h2>
      </Match>
      <Match when={props.variant === "h3"}>
        <h3 classList={classList()} {...componentProps()}>
          {props.children}
        </h3>
      </Match>
      <Match when={props.variant === "body2"}>
        <div
          classList={{
            ...classList(),
            body2: true,
          }}
          {...componentProps()}
        >
          {props.children}
        </div>
      </Match>
      <Match when={props.variant === "secondary"}>
        <div
          classList={{
            ...classList(),
            secondary: true,
          }}
          {...componentProps()}
        >
          {props.children}
        </div>
      </Match>
    </Switch>
  )
}
