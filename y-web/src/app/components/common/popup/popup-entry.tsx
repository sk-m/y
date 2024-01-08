import { ComponentWithChildren } from "@/module"

export type PopupEntryProps = {
  onClick?: (event: MouseEvent) => void
  size?: "normal" | "large"
}

export const PopupEntry: ComponentWithChildren<PopupEntryProps> = (props) => {
  return (
    <button
      onClick={(event) => props.onClick?.(event)}
      type="button"
      classList={{
        "ui-popup-entry": true,
        large: props.size === "large",
      }}
    >
      {props.children}
    </button>
  )
}
