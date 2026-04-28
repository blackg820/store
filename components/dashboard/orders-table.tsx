'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import type { Order, OrderStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MoreHorizontal, Search, Download, Plus, Eye, Edit, Trash2, AlertTriangle, Save } from 'lucide-react'
import { toast } from 'sonner'

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  confirmed: 'bg-primary/10 text-primary border-primary/20',
  delivered: 'bg-success/10 text-success border-success/20',
  returned: 'bg-muted text-muted-foreground border-muted',
  problematic: 'bg-destructive/10 text-destructive border-destructive/20',
}

interface OrdersTableProps {
  storeId?: string
  limit?: number
  showActions?: boolean
}

export function OrdersTable({ storeId, limit, showActions = true }: OrdersTableProps) {
  const { language } = useAuth()
  const { t } = useTranslations()
  const isAr = language === 'ar' || language === 'ku'
  const { orders, products, buyers, stores, updateOrderStatus, updateOrder, deleteOrder, isDataLoading, selectedStoreId } = useData()
  
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch)
    }
  }, [initialSearch])

  // Auto-open order if search matches exactly one ID (for deep linking)
  useEffect(() => {
    if (initialSearch && orders.length > 0) {
      const match = orders.find(o => 
        o.id === initialSearch || o.orderGroupId === initialSearch
      )
      if (match) {
        handleEdit(match)
      }
    }
  }, [initialSearch, orders.length]) // Trigger when orders load
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending')
  const [editBuyerName, setEditBuyerName] = useState('')
  const [editBuyerPhone, setEditBuyerPhone] = useState('')
  const [editGovernorate, setEditGovernorate] = useState('')
  const [editDistrict, setEditDistrict] = useState('')
  const [editTotalAmount, setEditTotalAmount] = useState(0)
  const [editDeliveryFee, setEditDeliveryFee] = useState(0)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')

  let filteredOrders = storeId 
    ? orders.filter(o => o.storeId === storeId)
    : orders

  if (statusFilter !== 'all') {
    filteredOrders = filteredOrders.filter(o => o.status === statusFilter)
  }

  if (dateRange !== 'all') {
    const now = new Date()
    filteredOrders = filteredOrders.filter(o => {
      const orderDate = new Date(o.createdAt)
      if (dateRange === 'today') return orderDate.toDateString() === now.toDateString()
      if (dateRange === 'week') return now.getTime() - orderDate.getTime() < 7 * 24 * 60 * 60 * 1000
      if (dateRange === 'month') return now.getTime() - orderDate.getTime() < 30 * 24 * 60 * 60 * 1000
      return true
    })
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filteredOrders = filteredOrders.filter(o => {
      const buyer = buyers.find(b => b.id === o.buyerId)
      const productNames = (o.items || []).map(i => i.product?.title || '').join(', ').toLowerCase()
      const orderId = (o.id || '').toLowerCase()
      const groupId = (o.orderGroupId || '').toLowerCase()
      const buyerName = (buyer?.name || '').toLowerCase()
      const buyerPhone = buyer?.phone || ''

      return (
        orderId.includes(q) ||
        groupId.includes(q) ||
        productNames.includes(q) ||
        buyerName.includes(q) ||
        buyerPhone.includes(q)
      )
    })
  }

  // Sort by date descending
  filteredOrders = [...filteredOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  if (limit) {
    filteredOrders = filteredOrders.slice(0, limit)
  }

  const handleExportPDF = () => {
    const unprocessed = filteredOrders.filter(o => ['pending', 'confirmed'].includes(o.status))
    if (unprocessed.length === 0) {
      toast.error(language === 'en' ? 'No unprocessed orders to export' : 'لا توجد طلبات غير معالجة للتصدير')
      return
    }
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const isAr = language === 'ar' || language === 'ku'
    const html = `
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}">
        <head>
          <title>Bulk Orders Export - ${new Date().toLocaleDateString()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #000; font-size: 28px; }
            .meta { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th, td { border: 1px solid #eee; padding: 12px 15px; text-align: ${isAr ? 'right' : 'left'}; }
            th { background-color: #f8f9fa; color: #444; font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
            tr:nth-child(even) { background-color: #fafafa; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; pt: 20px; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #eee; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Storify - Professional Order Report</h1>
              <p class="meta">Generated for: ${storeId ? 'Store #' + storeId : 'All Managed Stores'}</p>
            </div>
            <div style="text-align: right">
              <p class="meta">Date: ${new Date().toLocaleString()}</p>
              <p class="meta">Total Orders: ${unprocessed.length}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>${isAr ? 'المشتري' : 'Buyer'}</th>
                <th>${isAr ? 'الهاتف' : 'Phone'}</th>
                <th>${isAr ? 'المنتج' : 'Product'}</th>
                <th>${isAr ? 'المحافظة' : 'Gov'}</th>
                <th>${isAr ? 'القضاء' : 'District'}</th>
                <th>${isAr ? 'المجموع' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              ${unprocessed.map(o => {
                const buyer = buyers.find(b => b.id === o.buyerId)
                return `
                  <tr>
                    <td style="font-family: monospace; font-size: 11px;">#${o.id.slice(0, 8).toUpperCase()}</td>
                    <td><strong>${buyer?.name}</strong></td>
                    <td>${buyer?.phone}</td>
                    <td>${o.items.map(i => i.product?.title || '').join(', ')}</td>
                    <td>${buyer?.governorate || ''}</td>
                    <td>${buyer?.district || ''}</td>
                    <td style="font-weight: bold;">${o.totalAmount.toLocaleString()} IQD</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>© 2026 Storify SaaS Platform - Professional Order Management & Logistics</p>
            <p>System Signature: ${Math.random().toString(36).substring(7).toUpperCase()}</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleEdit = (order: Order) => {
    const buyer = buyers.find(b => b.id === order.buyerId)
    setSelectedOrder(order)
    setEditNotes(order.notes || '')
    setEditStatus(order.status)
    setEditBuyerName(buyer?.name || '')
    setEditBuyerPhone(buyer?.phone || '')
    setEditGovernorate(buyer?.governorate || '')
    setEditDistrict(buyer?.district || '')
    setEditTotalAmount(order.totalAmount)
    setEditDeliveryFee(order.deliveryFee || 0)
    setIsEditDialogOpen(true)
  }

  const handleView = (order: Order) => {
    setSelectedOrder(order)
    setIsViewDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (selectedOrder) {
      updateOrder(selectedOrder.id, { 
        notes: editNotes,
        status: editStatus,
        totalAmount: editTotalAmount,
        deliveryFee: editDeliveryFee,
        // Passing these as custom fields to updateOrder which I updated to handle them
        ...({
          buyerName: editBuyerName,
          buyerPhone: editBuyerPhone,
          governorate: editGovernorate,
          district: editDistrict,
        } as any)
      })
      setIsEditDialogOpen(false)
    }
  }

  const handleDelete = (orderId: string) => {
    if (confirm(t('areYouSure'))) {
      deleteOrder(orderId)
    }
  }

  const exportToCSV = () => {
    const headers = ['Order ID', 'Product', 'Buyer', 'Phone', 'Quantity', 'Total', 'Status', 'Date']
    const rows = filteredOrders.map(order => {
      const buyer = buyers.find(b => b.id === order.buyerId)
      return [
        order.id,
        order.items.map(i => i.product?.title || '').join('; '),
        buyer?.name || '',
        buyer?.phone || '',
        order.items.reduce((acc, curr) => acc + curr.quantity, 0),
        order.totalAmount,
        order.status,
        new Date(order.createdAt).toLocaleDateString(),
      ]
    })
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orders.csv'
    a.click()
  }

  return (
    <div className="space-y-6">
      {showActions && (
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between glass-card p-4 rounded-2xl border-white/10 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative group">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={t('search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10 w-full sm:w-72 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl transition-all h-11"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/10 rounded-xl h-11">
                <SelectValue placeholder={t('filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                <SelectItem value="delivered">{t('delivered')}</SelectItem>
                <SelectItem value="returned">{t('returned')}</SelectItem>
                <SelectItem value="problematic">{t('problematic')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
              <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/10 rounded-xl h-11">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 me-2">
              <Button 
                variant={density === 'comfortable' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDensity('comfortable')}
                className="rounded-lg h-9 px-3"
              >
                Comfortable
              </Button>
              <Button 
                variant={density === 'compact' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setDensity('compact')}
                className="rounded-lg h-9 px-3"
              >
                Compact
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="bg-white/5 border-white/10 hover:bg-white/10 rounded-xl h-11 px-6">
              <Download className="h-4 w-4 me-2" />
              {t('export')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="bg-white/5 border-white/10 hover:bg-white/10 rounded-xl h-11 px-6">
              <Download className="h-4 w-4 me-2" />
              {isAr ? 'تصدير PDF' : 'Export PDF'}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl glass-card border-white/10 overflow-hidden shadow-xl relative">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          <Table className="relative">
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-white/10 shadow-sm">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest py-4 ps-6">Order ID</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('products')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Buyer</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest text-center">{t('quantity')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('total')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('status')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('date')}</TableHead>
              {showActions && <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest text-end pe-6">{t('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDataLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="w-24 h-4 bg-muted/20 animate-pulse rounded" /></TableCell>
                  <TableCell><div className="w-48 h-4 bg-muted/20 animate-pulse rounded" /></TableCell>
                  <TableCell><div className="w-32 h-4 bg-muted/20 animate-pulse rounded" /></TableCell>
                  <TableCell className="text-center"><div className="w-8 h-4 bg-muted/20 animate-pulse rounded mx-auto" /></TableCell>
                  <TableCell><div className="w-20 h-4 bg-muted/20 animate-pulse rounded" /></TableCell>
                  <TableCell><div className="w-16 h-6 bg-muted/20 animate-pulse rounded-full" /></TableCell>
                  <TableCell><div className="w-24 h-4 bg-muted/20 animate-pulse rounded" /></TableCell>
                  {showActions && <TableCell className="text-end"><div className="w-8 h-8 bg-muted/20 animate-pulse rounded ml-auto" /></TableCell>}
                </TableRow>
              ))
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 8 : 7} className="text-center py-8 text-muted-foreground">
                  {t('noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const buyer = buyers.find(b => b.id === order.buyerId)
                const store = stores.find(s => s.id === order.storeId)
                const isHighRisk = buyer?.risk === 'high'

                return (
                  <TableRow key={order.id} className={cn(
                    'transition-colors hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer',
                    isHighRisk && 'bg-destructive/5',
                    density === 'compact' ? 'h-12' : 'h-20'
                  )} onClick={() => handleView(order)}>
                    <TableCell className={cn("font-mono text-sm ps-6", density === 'compact' ? "py-2" : "py-4")}>
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className={density === 'compact' ? "py-2" : "py-4"}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {order.items[0]?.product?.title || 'Unknown Product'}
                          {order.items.length > 1 && ` + ${order.items.length - 1} more`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.items.length} items
                        </span>
                        <p className="text-[10px] text-muted-foreground">{language === 'ar' ? store?.nameAr : store?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isHighRisk && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        <div>
                          <p className="font-medium">{buyer?.name}</p>
                          <p className="text-xs text-muted-foreground">{buyer?.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)}</TableCell>
                    <TableCell className="font-medium">{order.totalAmount.toLocaleString()} IQD</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize', statusColors[order.status])}>
                        {t(order.status as 'pending' | 'confirmed' | 'delivered' | 'returned' | 'problematic')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleView(order)}>
                              <Eye className="h-4 w-4 me-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(order)}>
                              <Edit className="h-4 w-4 me-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(order.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 me-2" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              {t('editOrder')} #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'Modify order details and customer information.' : 'تعديل تفاصيل الطلب ومعلومات العميل.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 md:grid-cols-2">
            {/* Customer Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {language === 'en' ? 'Customer Details' : 'تفاصيل العميل'}
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="buyerName">{t('name')}</Label>
                  <Input id="buyerName" value={editBuyerName} onChange={(e) => setEditBuyerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="buyerPhone">{t('phone')}</Label>
                  <Input id="buyerPhone" value={editBuyerPhone} onChange={(e) => setEditBuyerPhone(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="gov">{t('governorate')}</Label>
                    <Input id="gov" value={editGovernorate} onChange={(e) => setEditGovernorate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="district">{t('district')}</Label>
                    <Input id="district" value={editDistrict} onChange={(e) => setEditDistrict(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {language === 'en' ? 'Order Management' : 'إدارة الطلب'}
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('status')}</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as OrderStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                      <SelectItem value="delivered">{t('delivered')}</SelectItem>
                      <SelectItem value="returned">{t('returned')}</SelectItem>
                      <SelectItem value="problematic">{t('problematic')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="totalAmt">{language === 'en' ? 'Total Amount' : 'المجموع الكلي'}</Label>
                    <Input id="totalAmt" type="number" value={editTotalAmount} onChange={(e) => setEditTotalAmount(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="delFee">{language === 'en' ? 'Delivery Fee' : 'أجور التوصيل'}</Label>
                    <Input id="delFee" type="number" value={editDeliveryFee} onChange={(e) => setEditDeliveryFee(Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('notes')}</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    placeholder={language === 'en' ? 'Internal administrative notes...' : 'ملاحظات إدارية داخلية...'}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1 sm:flex-none">
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveEdit} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4 me-2" />
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('orderDetails')}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              {(() => {
                const buyer = buyers.find(b => b.id === selectedOrder.buyerId)
                const store = stores.find(s => s.id === selectedOrder.storeId)
                return (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Order ID</Label>
                      <p className="font-mono">{selectedOrder.id}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">{t('status')}</Label>
                      <Badge variant="outline" className={cn('capitalize', statusColors[selectedOrder.status])}>
                        {t(selectedOrder.status as 'pending' | 'confirmed' | 'delivered' | 'returned' | 'problematic')}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">{t('stores')}</Label>
                      <p>{language === 'ar' ? store?.nameAr : store?.name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Buyer</Label>
                      <div>
                        <p>{buyer?.name}</p>
                        <p className="text-sm text-muted-foreground">{buyer?.phone}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">{t('address')}</Label>
                      <p className="text-sm">{buyer?.governorate}, {buyer?.district}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Items</Label>
                        <div className="space-y-1 mt-1">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              {item.product?.title || 'Unknown'} x{item.quantity}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase">Total Amount</Label>
                        <p className="text-lg font-bold text-primary">{selectedOrder.totalAmount.toLocaleString()} IQD</p>
                      </div>
                    </div>
                    {selectedOrder.notes && (
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="text-muted-foreground">{t('notes')}</Label>
                        <p className="text-sm">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
