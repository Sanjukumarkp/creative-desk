import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/session'
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES } from '@/lib/storage'

/** Lets the uploader tell you up front if storage isn't connected. */
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  return NextResponse.json({ ready: !!process.env.BLOB_READ_WRITE_TOKEN })
}

// Issues short-lived tokens so the browser uploads straight to Blob storage.
// Large files never pass through this server.
export async function POST(request: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'File storage is not connected. Add a Vercel Blob store to the project.' }, { status: 500 })
  }
  const body = (await request.json()) as HandleUploadBody
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: true,
      }),
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
