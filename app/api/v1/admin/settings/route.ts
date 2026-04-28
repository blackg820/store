import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

// GET /api/v1/admin/settings
export async function GET(request: NextRequest) {
  try {
    const settings = await query('SELECT setting_key, setting_value FROM global_settings')
    const settingsMap = (settings as any[]).reduce((acc, s) => {
      acc[s.setting_key] = s.setting_value
      return acc
    }, {})

    return NextResponse.json(successResponse(settingsMap))
  } catch (error) {
    console.error('[Settings] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// POST /api/v1/admin/settings
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Access denied'), { status: 403 })
    }

    const body = await request.json()
    const { settings } = body // e.g. { site_name: "MySaaS" }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(errorResponse('Invalid settings data'), { status: 400 })
    }

    for (const [key, value] of Object.entries(settings)) {
      await execute(
        'INSERT INTO global_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(value), String(value)]
      )
    }

    return NextResponse.json(successResponse(null, 'Settings updated successfully'))
  } catch (error) {
    console.error('[Settings] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
