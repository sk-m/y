export const downloadFileURL = (url: string, filename: string) => {
  const a = document.createElement("a")
  a.style.position = "fixed"
  a.style.display = "none"
  a.download = filename
  a.href = url

  document.body.append(a)
  a.click()
  a.remove()
}
