import { createMemo, createSignal } from "solid-js"

type Position = { x: number; y: number }

type UseContextMenuProps = {
  onClose?: () => void
}

export const useContextMenu = (props?: UseContextMenuProps) => {
  const [position, setPosition] = createSignal<Position | null>(null)

  const open = (event: MouseEvent) => {
    setPosition({ x: event.x, y: event.y })
  }

  const close = () => {
    setPosition(null)
    props?.onClose?.()
  }

  const contextMenuProps = createMemo(() => ({
    position: position(),
    onClose: close,
  }))

  return {
    open,
    close,
    contextMenuProps,
  }
}
