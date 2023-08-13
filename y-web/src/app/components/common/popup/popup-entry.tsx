import { ComponentWithChildren } from "@/module"

export type PopupEntryProps = {
  onClick?: (event: MouseEvent) => void
}

export const PopupEntry: ComponentWithChildren<PopupEntryProps> = (props) => {
  return (
    <button
      onClick={(event) => props.onClick?.(event)}
      type="button"
      class="ui-popup-entry"
    >
      {props.children}
    </button>
  )
}
