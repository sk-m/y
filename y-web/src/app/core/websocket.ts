import { createRoot, onCleanup } from "solid-js"

import {
  makeHeartbeatWS,
  makeReconnectingWS,
} from "@solid-primitives/websocket"
import { z } from "zod"

import { debug } from "./utils"

const TWebsocketMessage = z
  .object({
    type: z.literal("storage_location_updated"),

    payload: z.object({
      endpoint_id: z.number(),
      folder_id: z.number().nullable(),

      invalidate_entries: z.boolean(),
      invalidate_thumbs: z.boolean(),
    }),
  })
  .or(
    z.object({
      type: z.literal("storage_user_archive_status_updated"),

      payload: z.object({
        user_archive_id: z.number(),
        ready: z.boolean(),
      }),
    })
  )
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
  const ws = makeHeartbeatWS(
    makeReconnectingWS(
      `ws://${window.location.host}/api/ws`,
      // eslint-disable-next-line no-undefined
      undefined,
      {
        delay: 5000,
      }
    )
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

    // TODO we create a new event listener on every call to onMessage. Maybe have just one for the whole app?
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
