import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export interface StorageProvider {
  upload(file: Buffer, fileName: string, contentType: string, folder?: string): Promise<{ url: string; filePath: string; provider: 'local' | 'bunny' }>
  delete(filePath: string, folder?: string): Promise<void>
}

class LocalStorageProvider implements StorageProvider {
  private uploadDir: string = path.join(process.cwd(), 'public/uploads')

  async upload(file: Buffer, fileName: string, contentType: string, folder?: string): Promise<{ url: string; filePath: string; provider: 'local' }> {
    const targetDir = folder ? path.join(this.uploadDir, folder) : this.uploadDir
    await fs.mkdir(targetDir, { recursive: true })
    
    const ext = path.extname(fileName) || '.jpg'
    const hash = crypto.randomBytes(16).toString('hex')
    const storedName = `${hash}${ext}`
    const filePath = path.join(targetDir, storedName)
    
    await fs.writeFile(filePath, file)
    
    const publicUrl = folder ? `/uploads/${folder}/${storedName}` : `/uploads/${storedName}`
    return { url: publicUrl, filePath: folder ? `${folder}/${storedName}` : storedName, provider: 'local' }
  }

  async delete(filePath: string, folder?: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath)
    try {
      await fs.unlink(fullPath)
    } catch (e) {
      console.warn(`[Storage] Failed to delete local file: ${fullPath}`, e)
    }
  }
}

// Placeholder for Bunny.net Integration
class BunnyStorageProvider implements StorageProvider {
  private storageZone = process.env.BUNNY_STORAGE_ZONE
  private apiKey = process.env.BUNNY_API_KEY
  private pullZone = process.env.BUNNY_PULL_ZONE
  private region = process.env.BUNNY_REGION || 'storage.bunnycdn.com'

  async upload(file: Buffer, fileName: string, contentType: string, folder?: string): Promise<{ url: string; filePath: string; provider: 'local' | 'bunny' }> {
    if (!this.storageZone || !this.apiKey || !this.pullZone) {
      // Fallback to local storage if Bunny is not configured
      return new LocalStorageProvider().upload(file, fileName, contentType, folder)
    }

    const hash = crypto.randomBytes(16).toString('hex')
    const ext = path.extname(fileName) || '.jpg'
    const storedName = `${hash}${ext}`
    
    // Construct the path for Bunny Storage
    const bunnyPath = folder ? `${this.storageZone}/${folder}/${storedName}` : `${this.storageZone}/${storedName}`
    const url = `https://${this.region}/${bunnyPath}`

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'AccessKey': this.apiKey,
          'Content-Type': contentType,
        },
        body: new Uint8Array(file),
      })

      if (!response.ok) {
        throw new Error(`Bunny.net upload failed: ${response.statusText}`)
      }

      return {
        url: folder ? `https://${this.pullZone}/${folder}/${storedName}` : `https://${this.pullZone}/${storedName}`,
        filePath: folder ? `${folder}/${storedName}` : storedName,
        provider: 'bunny'
      }
    } catch (error) {
      console.error('[Storage] Bunny.net upload error:', error)
      // Fallback to local
      return new LocalStorageProvider().upload(file, fileName, contentType, folder)
    }
  }

  async delete(filePath: string, folder?: string): Promise<void> {
    if (!this.storageZone || !this.apiKey) return

    const url = `https://${this.region}/${this.storageZone}/${filePath}`
    try {
      await fetch(url, {
        method: 'DELETE',
        headers: {
          'AccessKey': this.apiKey,
        },
      })
    } catch (error) {
      console.warn(`[Storage] Failed to delete file from Bunny.net: ${filePath}`, error)
    }
  }
}

export const storage = new BunnyStorageProvider()
