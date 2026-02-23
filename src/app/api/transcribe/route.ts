import { NextRequest } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { env } from '@/lib/env'
import { badRequest, errorResponse, serverError } from '@/lib/api'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB (Whisper limit)

export async function POST(request: NextRequest) {
  try {
    if (!env.OPENAI_API_KEY) {
      return serverError('OpenAI API key not configured')
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio')

    if (!audioFile || !(audioFile instanceof Blob)) {
      return badRequest('Missing audio file. Send a "audio" field with an audio blob.')
    }

    if (!audioFile.type.startsWith('audio/')) {
      return badRequest('Invalid file type. Must be an audio file.')
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return errorResponse('Audio file too large. Maximum size is 25MB.', 413)
    }

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

    const ext = audioFile.type.split('/')[1]?.split(';')[0] || 'webm'
    const file = await toFile(audioFile, `recording.${ext}`)

    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    })

    return Response.json({ text: transcription.text })
  } catch (error) {
    console.error('POST /api/transcribe error:', error)
    return serverError('Transcription failed')
  }
}
