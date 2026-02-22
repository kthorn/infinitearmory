import { uploadToLocal, deleteFromLocal } from './local-storage'

export interface StorageUploadParams {
  weaponId: string
  imageData: Buffer
  assetId?: string
  mimeType?: string
}

export interface StorageResult {
  key: string
  url: string
}

/**
 * Upload image to storage
 *
 * Currently uses local filesystem. When Component 13 (S3) is implemented,
 * this will auto-select S3 or local based on env configuration.
 */
export async function uploadImage(params: StorageUploadParams): Promise<StorageResult> {
  return uploadToLocal(params)
}

/**
 * Delete image from storage
 */
export async function deleteImage(urlOrKey: string): Promise<void> {
  const key = urlOrKey.startsWith('/uploads/') ? urlOrKey.replace('/uploads/', '') : urlOrKey
  await deleteFromLocal(key)
}
