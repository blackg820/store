import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'
import { getTranslations } from '@/lib/i18n-server'

// PATCH /api/v1/stores/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { t } = getTranslations(request)
    const { id } = await params
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })

    const body = await request.json()
    const { name, nameAr, slug, whatsappNumber, description, descriptionAr, logoUrl, coverUrl, status, deliveryDays, telegramToken, telegramUserId, telegramGroupId, telegramChatId, themeSettings, notificationSettings, optionPresets, defaultLanguage } = body

    // Verify ownership
    const store = await queryOne<{ user_id: number }>(
      'SELECT user_id FROM stores WHERE id = ? AND deleted_at IS NULL', [id]
    )
    if (!store || (payload.role !== 'admin' && store.user_id !== payload.userId)) {
      return NextResponse.json(errorResponse(t('storeNotFound')), { status: 403 })
    }

    const updates: string[] = []
    const paramsList: unknown[] = []

    if (name !== undefined) { updates.push('name = ?'); paramsList.push(name) }
    if (nameAr !== undefined) { updates.push('name_ar = ?'); paramsList.push(nameAr) }
    if (slug !== undefined) { updates.push('slug = ?'); paramsList.push(slug) }
    if (whatsappNumber !== undefined) { updates.push('whatsapp_number = ?'); paramsList.push(whatsappNumber) }
    if (description !== undefined) { updates.push('description = ?'); paramsList.push(description) }
    if (descriptionAr !== undefined) { updates.push('description_ar = ?'); paramsList.push(descriptionAr) }
    if (logoUrl !== undefined) { updates.push('logo_url = ?'); paramsList.push(logoUrl) }
    if (coverUrl !== undefined) { updates.push('cover_url = ?'); paramsList.push(coverUrl) }
    if (status !== undefined) { updates.push('status = ?'); paramsList.push(status) }
    if (deliveryDays !== undefined) { updates.push('delivery_time = ?'); paramsList.push(deliveryDays) }
    if (telegramToken !== undefined) { updates.push('telegram_token = ?'); paramsList.push(telegramToken) }
    if (telegramUserId) { updates.push('telegram_user_id = ?'); paramsList.push(telegramUserId) }
    if (telegramGroupId) { updates.push('telegram_group_id = ?'); paramsList.push(telegramGroupId) }
    if (telegramChatId) { updates.push('telegram_chat_id = ?'); paramsList.push(telegramChatId) }
    if (themeSettings !== undefined) { updates.push('theme_settings = ?'); paramsList.push(JSON.stringify(themeSettings)) }
    if (notificationSettings !== undefined) { updates.push('notification_settings = ?'); paramsList.push(JSON.stringify(notificationSettings)) }
    if (optionPresets !== undefined) { updates.push('option_presets = ?'); paramsList.push(JSON.stringify(optionPresets)) }
    if (defaultLanguage !== undefined) { updates.push('default_language = ?'); paramsList.push(defaultLanguage) }

    if (updates.length === 0) {
      return NextResponse.json(errorResponse('No fields to update'), { status: 400 })
    }

    updates.push('updated_at = NOW()')
    await query(
      `UPDATE stores SET ${updates.join(', ')} WHERE id = ?`,
      [...paramsList, id]
    )

    return NextResponse.json(successResponse(null, t('storeUpdated')))
  } catch (error) {
    console.error('[Stores] PATCH error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

// DELETE /api/v1/stores/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { t } = getTranslations(request)
    const { id } = await params
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })

    // Verify ownership or admin
    const store = await queryOne<{ user_id: number }>(
      'SELECT user_id FROM stores WHERE id = ? AND deleted_at IS NULL', [id]
    )
    if (!store || (payload.role !== 'admin' && store.user_id !== payload.userId)) {
      return NextResponse.json(errorResponse(t('storeNotFound')), { status: 403 })
    }

    await query('UPDATE stores SET deleted_at = NOW(), status = ? WHERE id = ?', ['suspended', id])

    return NextResponse.json(successResponse(null, t('storeDeleted')))
  } catch (error) {
    console.error('[Stores] DELETE error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
