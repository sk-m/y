import {
  Accessor,
  JSX,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
} from "solid-js"

import { ComponentWithChildren } from "@/module"

import { Button } from "../button/button"
import "./key-value.less"

export type KeyValueProps<TValue> = {
  label: string

  value: TValue
  onChange: (value: TValue) => void

  readonly?: boolean

  getValueString?: (value: TValue | null) => string

  inputField?: (inputProps: {
    onChange: (value: TValue) => void
    value: Accessor<TValue>
  }) => JSX.Element

  direction?: "row" | "column"
  keyWidth?: string
}

export type KeyValueFieldsProps = {
  style?: JSX.CSSProperties
}

export const KeyValueFields: ComponentWithChildren<KeyValueFieldsProps> = (
  props
) => {
  return (
    <div class="ui-keyvalue-fields" style={props.style}>
      {props.children}
    </div>
  )
}

export const KeyValue = <TValue,>(props: KeyValueProps<TValue>) => {
  let inputRef: HTMLInputElement | undefined

  // eslint-disable-next-line solid/reactivity
  const [value, setValue] = createSignal(props.value)
  const [active, setActive] = createSignal(false)

  // eslint-disable-next-line no-confusing-arrow
  const valueString = createMemo(() =>
    props.getValueString ? props.getValueString(value()) : String(value())
  )

  createEffect(
    on(
      () => props.value,
      () => {
        setValue(() => props.value)
      }
    )
  )

  createEffect(() => {
    if (active() && inputRef) {
      inputRef.focus()
      inputRef.select()
    }
  })

  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setValue(() => props.value)
        return setActive(false)
      }

      if (event.key === "Enter") {
        setActive(false)
        props.onChange(inputRef!.value as TValue)
      }
    }

    inputRef?.addEventListener("keydown", handler)

    onCleanup(() => {
      inputRef?.removeEventListener("keydown", handler)
    })
  })

  return (
    <div
      classList={{
        "ui-keyvalue": true,
        [`direction-${props.direction ?? "row"}`]: true,
        readonly: props.readonly,
      }}
    >
      <div
        class="key"
        style={
          (props.direction ?? "row") === "row"
            ? {
                width: props.keyWidth ?? "200px",
              }
            : {}
        }
      >
        {props.label}
      </div>
      <div
        classList={{
          value: true,
          active: active(),
        }}
        onClick={() =>
          !active() && !props.readonly && setActive((state) => !state)
        }
      >
        <div class="value-display">{valueString()}</div>
        <div class="value-input">
          <Show
            when={props.inputField}
            fallback={
              <input
                value={value() as string}
                onChange={(event) =>
                  setValue(() => event.currentTarget.value as TValue)
                }
                ref={(ref) => (inputRef = ref)}
                autocomplete="off"
              />
            }
          >
            {props.inputField!({
              onChange: setValue,
              value,
            })}
          </Show>

          <div class="actions">
            <Button
              leadingIcon="check"
              size="xs-squared"
              onClick={(event) => {
                event.stopPropagation()

                setActive(false)
                props.onChange(value())
              }}
            />
            <Button
              leadingIcon="close"
              size="xs-squared"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation()

                setValue(() => props.value)
                setActive(false)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
