import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, resolve, extname } from 'path'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

function getStorageDir(): string {
  if (env.STORAGE_DIR) return env.STORAGE_DIR
  if (env.NODE_ENV === 'production') return '/data/uploads'
  return './public/uploads'
}

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  const relativePath = segments.join('/')

  // Validate path: only allow weapon image paths with known extensions
  if (!/^weapons\/[\w-]+\/[\w.-]+\.(png|jpg|jpeg|webp|gif)$/.test(relativePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const storageDir = resolve(getStorageDir())
  const filepath = resolve(join(storageDir, relativePath))

  // Path traversal check
  if (!filepath.startsWith(storageDir + '/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await stat(filepath)
    const data = await readFile(filepath)
    const ext = extname(filepath).toLowerCase()
    const contentType = MIME_TYPES[ext]
    if (!contentType) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
