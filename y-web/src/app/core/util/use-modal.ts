import { createSignal } from "solid-js"

export const useModal = () => {
  const [isOpen, setIsOpen] = createSignal(false)
  const setOpen = () => setIsOpen(true)
  const setClose = () => setIsOpen(false)

  return { isOpen, setOpen, setClose }
}
