import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export interface ApiError {
  error: string
  details?: unknown
}

export function errorResponse(message: string, status: number, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json({ error: message, details }, { status })
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return errorResponse(message, 400, details)
}

export function notFound(message: string): NextResponse<ApiError> {
  return errorResponse(message, 404)
}

export function serverError(message: string): NextResponse<ApiError> {
  return errorResponse(message, 500)
}

export function handleZodError(error: ZodError): NextResponse<ApiError> {
  const details = error.issues.map((e) => ({
    path: e.path.join('.'),
    message: e.message,
  }))
  return badRequest('Validation failed', details)
}
