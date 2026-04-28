import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken, extractTokenFromHeader, successResponse, errorResponse } from '@/lib/jwt'

// GET /api/v1/analytics
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'))
    if (!token) return NextResponse.json(errorResponse('Authorization required'), { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.type !== 'access') return NextResponse.json(errorResponse('Invalid or expired token'), { status: 401 })

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('store_id')
    const period = parseInt(searchParams.get('period') || '30')

    // Build tenant filter
    let storeFilter = 's.deleted_at IS NULL'
    const storeParams: unknown[] = []
    if (payload.role !== 'admin') {
      storeFilter += ' AND s.user_id = ?'
      storeParams.push(payload.userId)
    }
    if (storeId) {
      storeFilter += ' AND s.id = ?'
      storeParams.push(storeId)
    }

    // Summary stats
    const orderStats = await query<Record<string, unknown>>(
      `SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN o.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN o.status = 'returned' THEN 1 ELSE 0 END) as returned,
        SUM(CASE WHEN o.status = 'problematic' THEN 1 ELSE 0 END) as problematic,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as total_revenue
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE ${storeFilter} AND o.deleted_at IS NULL AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [...storeParams, period]
    )

    const stats = orderStats[0] || {}
    const totalOrders = Number(stats.total_orders) || 0
    const deliveredOrders = Number(stats.delivered) || 0
    const totalRevenue = Number(stats.total_revenue) || 0

    // Store count
    const storeCount = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM stores s WHERE ${storeFilter}`, storeParams
    )

    // Product count
    const productCount = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM products p JOIN stores s ON p.store_id = s.id WHERE ${storeFilter} AND p.deleted_at IS NULL`, storeParams
    )

    // Buyer count
    const buyerCount = await query<{ total: number }>(
      'SELECT COUNT(*) as total FROM buyers WHERE deleted_at IS NULL', []
    )

    // Top products
    const topProducts = await query(
      `SELECT p.id, p.title as name, COUNT(o.id) as order_count
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN stores s ON o.store_id = s.id
       WHERE ${storeFilter} AND o.deleted_at IS NULL AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY p.id, p.title
       ORDER BY order_count DESC LIMIT 5`,
      [...storeParams, period]
    )

    // Daily orders (last N days)
    const dailyOrders = await query(
      `SELECT DATE(o.created_at) as date, COUNT(*) as orders,
              COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as revenue
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE ${storeFilter} AND o.deleted_at IS NULL AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(o.created_at)
       ORDER BY date ASC`,
      [...storeParams, period]
    )

    // Store performance
    const storePerformance = await query(
      `SELECT s.id, s.name, s.status,
              COUNT(o.id) as total_orders,
              (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.deleted_at IS NULL) as total_products,
              COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as revenue
       FROM stores s
       LEFT JOIN orders o ON o.store_id = s.id AND o.deleted_at IS NULL
       WHERE ${storeFilter}
       GROUP BY s.id, s.name, s.status`,
      storeParams
    )

    // Risk distribution
    const riskDist = await query(
      `SELECT risk_level, COUNT(*) as count, SUM(is_blacklisted) as blacklisted
       FROM buyers WHERE deleted_at IS NULL GROUP BY risk_level`, []
    )

    const riskDistribution = { low: 0, medium: 0, high: 0, blacklisted: 0 }
    for (const r of riskDist as Record<string, unknown>[]) {
      const level = String(r.risk_level) as keyof typeof riskDistribution
      if (level in riskDistribution) riskDistribution[level] = Number(r.count)
      riskDistribution.blacklisted += Number(r.blacklisted) || 0
    }

    return NextResponse.json(successResponse({
      period,
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: deliveredOrders > 0 ? Math.round((totalRevenue / deliveredOrders) * 100) / 100 : 0,
        conversionRate: totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 1000) / 10 : 0,
        returnRate: totalOrders > 0 ? Math.round(((Number(stats.returned) + Number(stats.problematic)) / totalOrders) * 1000) / 10 : 0,
        totalStores: storeCount[0]?.total || 0,
        totalProducts: productCount[0]?.total || 0,
        totalBuyers: buyerCount[0]?.total || 0,
      },
      statusDistribution: {
        pending: Number(stats.pending) || 0,
        confirmed: Number(stats.confirmed) || 0,
        delivered: deliveredOrders,
        returned: Number(stats.returned) || 0,
        problematic: Number(stats.problematic) || 0,
      },
      topProducts: (topProducts as Record<string, unknown>[]).map(p => ({
        id: String(p.id),
        name: p.name,
        nameAr: p.name,
        orderCount: Number(p.order_count),
      })),
      dailyOrders: (dailyOrders as Record<string, unknown>[]).map(d => ({
        date: String(d.date),
        orders: Number(d.orders),
        revenue: Number(d.revenue),
      })),
      storePerformance: (storePerformance as Record<string, unknown>[]).map(s => ({
        id: String(s.id),
        name: s.name,
        nameAr: s.name,
        totalOrders: Number(s.total_orders),
        totalProducts: Number(s.total_products),
        revenue: Number(s.revenue),
        isActive: s.status === 'active',
      })),
      riskDistribution,
    }))
  } catch (error) {
    console.error('[Analytics] GET error:', error)
    return NextResponse.json(errorResponse('Internal server error'), { status: 500 })
  }
}
