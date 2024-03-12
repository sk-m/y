import { Tail } from "@/app/core/utils"

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type RequestData = {
  query?: URLSearchParams
  body?: Record<string, unknown>
  rawBody?: BodyInit
  contentType?: string
}

export type ResponseError = {
  code: string
}

export type ResponseData = {
  error?: ResponseError
} & Record<string, unknown>

const request = async (
  method: RequestMethod,
  endpoint: string,
  data?: RequestData,
  requestOptions?: RequestInit
) => {
  const path = data?.query ? `${endpoint}?${data.query.toString()}` : endpoint

  const response = await fetch(`/api${path}`, {
    method: method,
    mode: "cors",
    credentials: "same-origin",
    referrerPolicy: "same-origin",

    body: data?.rawBody ?? (data?.body && JSON.stringify(data.body)),

    ...requestOptions,

    headers: {
      "Content-Type": data?.contentType ?? "application/json",
      ...requestOptions?.headers,
    },
  })

  return response.json().then((json: ResponseData) => {
    if (json.error) throw json.error
    return json
  })
}

type RequestParameters = Tail<Parameters<typeof request>>

const createRequest =
  (method: RequestMethod) =>
  async (...args: RequestParameters) =>
    request(method, ...args)

export const { get, post, put, patch, del } = {
  get: createRequest("GET"),
  post: createRequest("POST"),
  put: createRequest("PUT"),
  patch: createRequest("PATCH"),
  del: createRequest("DELETE"),
}
