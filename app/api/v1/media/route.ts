import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, insert } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'
import { storage } from '@/lib/storage'
import { getTranslations } from '@/lib/i18n-server'

export async function POST(request: NextRequest) {
  try {
    const { t } = getTranslations(request)
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse(t('authRequired')), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse(t('invalidToken')), { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const storeId = formData.get('storeId') as string
    const productId = formData.get('productId') as string

    if (!file) return NextResponse.json(errorResponse(t('noFileUploaded')), { status: 400 })
    if (!storeId) return NextResponse.json(errorResponse(t('selectStoreFirst')), { status: 400 })

    // Verify store ownership
    if (storeId !== '0') {
      const store = await queryOne<{ id: number; user_id: number }>(
        'SELECT id, user_id FROM stores WHERE id = ? AND deleted_at IS NULL', [storeId]
      )
      if (!store || (payload.role !== 'admin' && store.user_id !== payload.userId)) {
        return NextResponse.json(errorResponse(t('storeNotFound')), { status: 403 })
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const folder = storeId !== '0' ? `store_${storeId}` : undefined
    const uploadResult = await storage.upload(buffer, file.name, file.type, folder)

    const mediaId = await insert(
      `INSERT INTO media (store_id, product_id, url, file_path, file_size, type, storage_provider, visibility, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        storeId === '0' ? null : storeId, 
        productId || null, 
        uploadResult.url, 
        uploadResult.filePath,
        file.size,
        file.type.startsWith('image/') ? 'image' : 'video',
        uploadResult.provider,
        'public'
      ]
    )

    return NextResponse.json(successResponse({
      id: String(mediaId),
      url: uploadResult.url,
      type: file.type.startsWith('image/') ? 'image' : 'video'
    }, 'File uploaded successfully'))

  } catch (error) {
    console.error('[Media] POST error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const productId = searchParams.get('product_id')

    let sql = 'SELECT * FROM media WHERE deleted_at IS NULL'
    const params: any[] = []

    if (storeId) {
      sql += ' AND store_id = ?'
      params.push(storeId)
    }
    if (productId) {
      sql += ' AND product_id = ?'
      params.push(productId)
    }

    const results = await query<any>(sql, params)
    const mapped = results.map((m: any) => ({
      id: String(m.id),
      url: m.url,
      type: m.type,
      productId: m.product_id ? String(m.product_id) : null
    }))

    return NextResponse.json(successResponse(mapped))
  } catch (error) {
    console.error('[Media] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
