/**
 * Bunny.net CDN Integration
 *
 * Production integration stub for Bunny.net Storage Zones.
 * Requires env vars: BUNNY_STORAGE_ZONE, BUNNY_API_KEY, BUNNY_PULL_ZONE
 *
 * In production, add these to your Vercel project environment variables.
 */

interface BunnyUploadResult {
  url: string
  cdnUrl: string
  size: number
  path: string
}

const BUNNY_STORAGE_ZONE = process.env.BUNNY_STORAGE_ZONE ?? ''
const BUNNY_API_KEY = process.env.BUNNY_API_KEY ?? ''
const BUNNY_PULL_ZONE = process.env.BUNNY_PULL_ZONE ?? ''
const BUNNY_REGION = process.env.BUNNY_REGION ?? 'storage.bunnycdn.com'

export function isBunnyConfigured(): boolean {
  return Boolean(BUNNY_STORAGE_ZONE && BUNNY_API_KEY && BUNNY_PULL_ZONE)
}

/**
 * Upload a file to Bunny Storage Zone
 */
export async function uploadToBunny(
  file: ArrayBuffer | Blob,
  path: string,
  contentType = 'application/octet-stream'
): Promise<BunnyUploadResult> {
  if (!isBunnyConfigured()) {
    throw new Error(
      'Bunny.net not configured. Set BUNNY_STORAGE_ZONE, BUNNY_API_KEY, BUNNY_PULL_ZONE env vars.'
    )
  }

  const url = `https://${BUNNY_REGION}/${BUNNY_STORAGE_ZONE}/${path}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: BUNNY_API_KEY,
      'Content-Type': contentType,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Bunny upload failed: ${response.status} ${response.statusText}`)
  }

  const size = file instanceof Blob ? file.size : file.byteLength

  return {
    url,
    cdnUrl: `https://${BUNNY_PULL_ZONE}/${path}`,
    size,
    path,
  }
}

/**
 * Delete a file from Bunny Storage Zone
 */
export async function deleteFromBunny(path: string): Promise<boolean> {
  if (!isBunnyConfigured()) {
    console.warn('[Bunny] Not configured - skipping delete:', path)
    return false
  }

  const url = `https://${BUNNY_REGION}/${BUNNY_STORAGE_ZONE}/${path}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { AccessKey: BUNNY_API_KEY },
  })

  return response.ok
}

/**
 * Batch delete files (used by cleanup cron)
 */
export async function batchDeleteFromBunny(
  paths: string[]
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0
  let failed = 0
  for (const path of paths) {
    const ok = await deleteFromBunny(path)
    ok ? deleted++ : failed++
  }
  return { deleted, failed }
}

/**
 * Generate a signed URL for private/restricted media access.
 * Uses Bunny's Token Authentication feature.
 */
export function generateSignedUrl(
  path: string,
  expiresInSeconds = 3600
): string {
  const baseUrl = `https://${BUNNY_PULL_ZONE}/${path}`
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds

  // Bunny Token Authentication: token = base64(MD5(key + path + expires))
  // In production, use a real MD5 implementation. This is a simple stub.
  const token = Buffer.from(`${BUNNY_API_KEY}${path}${expires}`)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${baseUrl}?token=${token}&expires=${expires}`
}

/**
 * Calculate storage used by a user (mock implementation).
 * In production, query the database for sum of media.size.
 */
export function calculateStorageUsed(mediaEntries: { size: number }[]): number {
  return mediaEntries.reduce((sum, m) => sum + m.size, 0)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
