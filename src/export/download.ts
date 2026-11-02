/** Save a file through the browser's normal download. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Give the browser a moment to start the download before releasing the data
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
