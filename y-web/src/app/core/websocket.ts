import { createRoot, onCleanup } from "solid-js"

import { makeReconnectingWS } from "@solid-primitives/websocket"
import { z } from "zod"

import { debug } from "./utils"

const TWebsocketMessage = z
  .object({
    type: z.literal("storage_location_updated"),

    payload: z.object({
      endpoint_id: z.number(),
      folder_id: z.number().nullable(),
    }),
  })
  .or(
    z.object({
      type: z.literal("ok"),
    })
  )
  .or(
    z.object({
      type: z.literal("error"),
    })
  )

type IWebsocketMessage = z.infer<typeof TWebsocketMessage>

const createWebsocketController = () => {
  // Heartbeat task is running on the server, no need to do that on the frontend
  const ws = makeReconnectingWS(
    `ws://${window.location.host}/api/ws`,
    // eslint-disable-next-line no-undefined
    undefined,
    {
      delay: 5000,
    }
  )

  const send = (message: string) => {
    debug("Sending ws message: ", message)

    ws.send(message)
  }

  const onMessage = (handler: (message: IWebsocketMessage) => void) => {
    const innerHandle = (event: Event & { data: string }) => {
      const message = TWebsocketMessage.parse(JSON.parse(event.data))

      debug("Received ws message: ", message)

      handler(message)
    }

    ws.addEventListener("message", innerHandle)

    onCleanup(() => {
      ws.removeEventListener("message", innerHandle)
    })
  }

  return {
    ws,

    send,
    onMessage,
  }
}

export const websocketCtl = createRoot(createWebsocketController)
