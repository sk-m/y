export type TableInput = Partial<{
  orderBy: string
  limit: number
  skip: number
  search: string
}>

export const appendTableInput = (query: URLSearchParams, input: TableInput) => {
  if (input.orderBy) query.set("order_by", input.orderBy)
  if (input.limit) query.set("limit", input.limit.toString())
  if (input.skip) query.set("skip", input.skip.toString())
  if (input.search) query.set("search", input.search.trim())
}
