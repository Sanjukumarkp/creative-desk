'use client'

import { upload } from '@vercel/blob/client'

export type MediaInfo = {
  kind: 'video' | 'image'
  width: number | null
  height: number | null
  duration: number | null
  thumb: Blob | null
}

const THUMB_MAX = 720

function drawToJpeg(src: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  const scale = Math.min(1, THUMB_MAX / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82))
}

/** Reads dimensions/duration and grabs a poster frame in the browser, so no server-side video processing is needed. */
export async function inspect(file: File): Promise<MediaInfo> {
  const url = URL.createObjectURL(file)
  try {
    if (file.type.startsWith('image/')) {
      const img = new Image()
      img.src = url
      await img.decode()
      const thumb = file.size > 400_000 ? await drawToJpeg(img, img.naturalWidth, img.naturalHeight) : null
      return { kind: 'image', width: img.naturalWidth, height: img.naturalHeight, duration: null, thumb }
    }
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('This browser cannot read that video file.'))
      setTimeout(() => resolve(), 15000)
    })
    const duration = Number.isFinite(video.duration) ? video.duration : null
    const w = video.videoWidth || null
    const h = video.videoHeight || null
    let thumb: Blob | null = null
    if (w && h) {
      const target = duration ? Math.min(1, duration * 0.1) : 0
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        video.onseeked = done
        setTimeout(done, 8000)
        video.currentTime = target
      })
      thumb = await drawToJpeg(video, w, h).catch(() => null)
    }
    return { kind: 'video', width: w, height: h, duration, thumb }
  } catch {
    return { kind: file.type.startsWith('image/') ? 'image' : 'video', width: null, height: null, duration: null, thumb: null }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function safeName(name: string) {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'file'
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin'
  return `${base}.${ext}`
}

export async function putFile(folder: string, file: File | Blob, name: string, onProgress?: (pct: number) => void) {
  const big = file.size > 50 * 1024 * 1024
  const result = await upload(`${folder}/${safeName(name)}`, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    multipart: big,
    contentType: file.type || undefined,
    onUploadProgress: onProgress ? (e) => onProgress(e.percentage) : undefined,
  })
  return result
}
