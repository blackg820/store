/**
 * CSV Export Utilities
 * Production-grade CSV generation with proper escaping for all edge cases.
 */

export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function arrayToCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns?: { key: keyof T; header: string }[]
): string {
  if (rows.length === 0) return ''

  const cols =
    columns ??
    (Object.keys(rows[0]) as (keyof T)[]).map((key) => ({
      key,
      header: String(key),
    }))

  const header = cols.map((c) => escapeCSVValue(c.header)).join(',')
  const body = rows
    .map((row) => cols.map((c) => escapeCSVValue(row[c.key])).join(','))
    .join('\n')

  return `${header}\n${body}`
}

export function downloadCSV(content: string, filename: string) {
  // BOM for Excel UTF-8 support (for Arabic characters)
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportOrdersToCSV(
  orders: Array<{
    id: string
    storeId: string
    productId: string
    buyerId: string
    quantity: number
    totalPrice: number
    status: string
    notes: string
    createdAt: string
  }>,
  storeName = 'all'
) {
  const csv = arrayToCSV(orders, [
    { key: 'id', header: 'Order ID' },
    { key: 'storeId', header: 'Store ID' },
    { key: 'productId', header: 'Product ID' },
    { key: 'buyerId', header: 'Buyer ID' },
    { key: 'quantity', header: 'Quantity' },
    { key: 'totalPrice', header: 'Total Price' },
    { key: 'status', header: 'Status' },
    { key: 'notes', header: 'Notes' },
    { key: 'createdAt', header: 'Created At' },
  ])
  const timestamp = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `orders-${storeName}-${timestamp}.csv`)
}

export function exportBuyersToCSV(
  buyers: Array<{
    id: string
    phone: string
    name: string
    governorate: string
    district: string
    landmark: string
    totalOrders: number
    rejectedOrders: number
    riskScore: string
    isBlacklisted: boolean
    createdAt: string
  }>
) {
  const csv = arrayToCSV(buyers, [
    { key: 'phone', header: 'Phone' },
    { key: 'name', header: 'Name' },
    { key: 'governorate', header: 'Governorate' },
    { key: 'district', header: 'District' },
    { key: 'landmark', header: 'Landmark' },
    { key: 'totalOrders', header: 'Total Orders' },
    { key: 'rejectedOrders', header: 'Rejected Orders' },
    { key: 'riskScore', header: 'Risk Score' },
    { key: 'isBlacklisted', header: 'Blacklisted' },
    { key: 'createdAt', header: 'Registered At' },
  ])
  const timestamp = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `buyers-${timestamp}.csv`)
}

export function exportStoresToCSV(
  stores: Array<{
    id: string
    name: string
    slug: string
    userId: string
    isActive: boolean
    createdAt: string
  }>
) {
  const csv = arrayToCSV(stores, [
    { key: 'id', header: 'Store ID' },
    { key: 'name', header: 'Name' },
    { key: 'slug', header: 'Slug' },
    { key: 'userId', header: 'Owner ID' },
    { key: 'isActive', header: 'Active' },
    { key: 'createdAt', header: 'Created At' },
  ])
  const timestamp = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `stores-${timestamp}.csv`)
}
