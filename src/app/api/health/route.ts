import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
