export const updateLocationStorage = (
  endpointId: number,
  folderId: number | null
) => `set_location;storage;${endpointId};${folderId ?? "null"}`
