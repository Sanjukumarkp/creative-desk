import 'server-only'
import { del } from '@vercel/blob'

// All file storage goes through this module and app/api/upload/route.ts.
// To move to Cloudflare R2 or S3 later, swap these two files for presigned-URL equivalents.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB per file
export const ALLOWED_TYPES = ['video/*', 'image/*']

export async function deleteFiles(urls: (string | null | undefined)[]) {
  const list = urls.filter((u): u is string => !!u)
  if (!list.length || !process.env.BLOB_READ_WRITE_TOKEN) return
  try {
    await del(list)
  } catch (err) {
    // A missing file shouldn't block deleting the record.
    console.error('[storage] delete failed', err)
  }
}
