import { createMemo, createSignal } from "solid-js"

type Position = { x: number; y: number }

export const useContextMenu = () => {
  const [position, setPosition] = createSignal<Position | null>(null)

  const open = (event: MouseEvent) => {
    setPosition({ x: event.x, y: event.y })
  }

  const close = () => {
    setPosition(null)
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
