import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const userId = resolvedParams.id
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    const body = await request.json()
    const { name, email, role, mode, status, isActive } = body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) { updates.push('name = ?'); values.push(name) }
    if (email !== undefined) { updates.push('email = ?'); values.push(email) }
    if (role !== undefined) { updates.push('role = ?'); values.push(role) }
    if (mode !== undefined) { updates.push('mode = ?'); values.push(mode) }
    
    // Support both 'status' and 'isActive' for convenience
    if (status !== undefined) { updates.push('status = ?'); values.push(status) }
    else if (isActive !== undefined) { 
      updates.push('status = ?'); 
      values.push(isActive ? 'active' : 'suspended') 
    }

    updates.push('updated_at = NOW()')

    if (updates.length > 1) {
      values.push(userId)
      await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)
    }

    return NextResponse.json(successResponse({ id: userId }, 'User updated successfully'))
  } catch (error) {
    console.error('[Admin User Update] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const userId = resolvedParams.id
    
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json(errorResponse('Unauthorized'), { status: 403 })
    }

    await execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId])

    return NextResponse.json(successResponse({ id: userId }, 'User deleted successfully'))
  } catch (error) {
    console.error('[Admin User Delete] error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
