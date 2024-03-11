const bytesInKB = 1024
const ordersOfMagnitude = ["B", "KB", "MB", "GB", "TB"]

// TODO this is kinda ugly :(
export const formatBytes = (bytes: number, decimals = 0) => {
  if (bytes === 0) return "0 B"

  const index = Math.floor(Math.log(bytes) / Math.log(bytesInKB))

  return `${Number.parseFloat(
    (bytes / Math.pow(bytesInKB, index)).toFixed(decimals)
  )} ${ordersOfMagnitude[index]?.toString() ?? ""}`
}
