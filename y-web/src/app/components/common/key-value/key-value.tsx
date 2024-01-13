import {
  Accessor,
  JSX,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onMount,
} from "solid-js"

import { ComponentWithChildren } from "@/module"

import { Icon } from "../icon/icon"
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
    inputRef?.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setValue(() => props.value)
        return setActive(false)
      }

      if (event.key === "Enter") {
        setActive(false)
        props.onChange(inputRef!.value as TValue)
      }
    })
  })

  return (
    <div
      classList={{
        "ui-keyvalue": true,
        readonly: props.readonly,
      }}
    >
      <div
        class="key"
        style={{
          width: props.keyWidth ?? "200px",
        }}
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
              />
            }
          >
            {props.inputField!({
              onChange: setValue,
              value,
            })}
          </Show>

          <div class="actions">
            <button
              class="action"
              title="save"
              onClick={(event) => {
                event.stopPropagation()

                setActive(false)
                props.onChange(value())
              }}
            >
              <Icon size={14} wght={500} grad={25} name="check" />
            </button>
            <button
              class="action"
              title="discard"
              onClick={(event) => {
                event.stopPropagation()

                setValue(() => props.value)
                setActive(false)
              }}
            >
              <Icon size={14} wght={500} grad={25} name="close" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
