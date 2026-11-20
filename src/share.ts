// Native share sheet when the device supports sharing files (phones, some desktops); otherwise download.
export async function shareImage(blob: Blob, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], 'thocktype-resultado.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled' // user closed the sheet
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return 'downloaded'
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}
