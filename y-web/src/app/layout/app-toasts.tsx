import { For, Show } from "solid-js"

import { Icon } from "../components/common/icon/icon"
import { toastCtl } from "../core/toast"
import "./app-toasts.less"

export const AppToasts = () => {
  const { toasts, remove } = toastCtl

  return (
    <div id="app-toasts-container">
      <div class="toasts">
        <For each={toasts()}>
          {(toast) => (
            <div
              onClick={() => remove(toast.id)}
              classList={{
                toast: true,
                [`severity-${toast.severity ?? "info"}`]: true,
              }}
            >
              <Show when={toast.icon}>
                <div class="icon-container">
                  <Icon size={14} wght={600} grad={25} name={toast.icon!} />
                </div>
              </Show>
              <div class="content-container">
                <Show when={!toast.icon}>
                  <div class="decorations">
                    <Icon size={12} wght={500} grad={25} name="check" />
                    <div class="line" />
                  </div>
                </Show>
                <div class="content">
                  <div class="toast-title">{toast.title}</div>

                  <Show when={toast.content}>
                    <div class="toast-content">{toast.content}</div>
                  </Show>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
