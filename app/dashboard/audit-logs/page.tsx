'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { mockSystemAuditLogs, mockUsers } from '@/lib/mock-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, FileText, Eye, Download } from 'lucide-react'
import type { AuditLog } from '@/lib/types'

export default function AuditLogsPage() {
  const { user, language } = useAuth()
  const isRtl = language === 'ar'
  const isAdmin = user?.role === 'admin'

  const [searchTerm, setSearchTerm] = useState('')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Filter logs based on user role
  let logs = isAdmin
    ? mockSystemAuditLogs
    : mockSystemAuditLogs.filter(log => log.userId === user?.id)

  // Apply filters
  if (entityFilter !== 'all') {
    logs = logs.filter(log => log.entityType === entityFilter)
  }
  if (actionFilter !== 'all') {
    logs = logs.filter(log => log.action === actionFilter)
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    logs = logs.filter(log =>
      log.entityId.toLowerCase().includes(term) ||
      log.entityType.toLowerCase().includes(term) ||
      JSON.stringify(log.newValue).toLowerCase().includes(term)
    )
  }

  // Sort by date descending
  logs = [...logs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      status_change: 'outline',
    }
    const labels: Record<string, { en: string; ar: string }> = {
      create: { en: 'Create', ar: 'إنشاء' },
      update: { en: 'Update', ar: 'تحديث' },
      delete: { en: 'Delete', ar: 'حذف' },
      status_change: { en: 'Status Change', ar: 'تغيير الحالة' },
    }
    return (
      <Badge variant={variants[action] || 'outline'}>
        {isRtl ? labels[action]?.ar : labels[action]?.en}
      </Badge>
    )
  }

  const getEntityBadge = (entityType: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      store: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      product: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      order: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      buyer: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      subscription: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    }
    const labels: Record<string, { en: string; ar: string }> = {
      user: { en: 'User', ar: 'مستخدم' },
      store: { en: 'Store', ar: 'متجر' },
      product: { en: 'Product', ar: 'منتج' },
      order: { en: 'Order', ar: 'طلب' },
      buyer: { en: 'Buyer', ar: 'مشتري' },
      subscription: { en: 'Subscription', ar: 'اشتراك' },
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[entityType] || ''}`}>
        {isRtl ? labels[entityType]?.ar : labels[entityType]?.en}
      </span>
    )
  }

  const getUserName = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    return user?.name || userId
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  }

  const exportLogs = () => {
    const csvContent = [
      ['ID', 'Date', 'User', 'Entity Type', 'Entity ID', 'Action', 'Changes'].join(','),
      ...logs.map(log => [
        log.id,
        log.createdAt,
        getUserName(log.userId),
        log.entityType,
        log.entityId,
        log.action,
        JSON.stringify(log.newValue || {}).replace(/,/g, ';'),
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isRtl ? 'سجلات التدقيق' : 'Audit Logs'}
          </h1>
          <p className="text-muted-foreground">
            {isRtl ? 'تتبع جميع التغييرات والإجراءات في النظام' : 'Track all changes and actions in the system'}
          </p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 me-2" />
          {isRtl ? 'تصدير CSV' : 'Export CSV'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isRtl ? 'سجلات النظام' : 'System Logs'}
          </CardTitle>
          <CardDescription>
            {isRtl
              ? `${logs.length} سجل في المجموع`
              : `${logs.length} logs total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isRtl ? 'بحث في السجلات...' : 'Search logs...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="ps-10"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'نوع الكيان' : 'Entity Type'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="user">{isRtl ? 'مستخدم' : 'User'}</SelectItem>
                  <SelectItem value="store">{isRtl ? 'متجر' : 'Store'}</SelectItem>
                  <SelectItem value="product">{isRtl ? 'منتج' : 'Product'}</SelectItem>
                  <SelectItem value="order">{isRtl ? 'طلب' : 'Order'}</SelectItem>
                  <SelectItem value="buyer">{isRtl ? 'مشتري' : 'Buyer'}</SelectItem>
                  <SelectItem value="subscription">{isRtl ? 'اشتراك' : 'Subscription'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'الإجراء' : 'Action'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRtl ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="create">{isRtl ? 'إنشاء' : 'Create'}</SelectItem>
                  <SelectItem value="update">{isRtl ? 'تحديث' : 'Update'}</SelectItem>
                  <SelectItem value="delete">{isRtl ? 'حذف' : 'Delete'}</SelectItem>
                  <SelectItem value="status_change">{isRtl ? 'تغيير الحالة' : 'Status Change'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRtl ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{isRtl ? 'المستخدم' : 'User'}</TableHead>
                  <TableHead>{isRtl ? 'الكيان' : 'Entity'}</TableHead>
                  <TableHead>{isRtl ? 'المعرف' : 'ID'}</TableHead>
                  <TableHead>{isRtl ? 'الإجراء' : 'Action'}</TableHead>
                  <TableHead className="text-end">{isRtl ? 'التفاصيل' : 'Details'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {isRtl ? 'لا توجد سجلات' : 'No logs found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {getUserName(log.userId)}
                      </TableCell>
                      <TableCell>
                        {getEntityBadge(log.entityType)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityId.substring(0, 12)}...
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="text-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>
                                {isRtl ? 'تفاصيل السجل' : 'Log Details'}
                              </DialogTitle>
                              <DialogDescription>
                                {log.id}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-muted-foreground">
                                    {isRtl ? 'التاريخ' : 'Date'}
                                  </Label>
                                  <p className="font-medium">{formatDate(log.createdAt)}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">
                                    {isRtl ? 'المستخدم' : 'User'}
                                  </Label>
                                  <p className="font-medium">{getUserName(log.userId)}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">
                                    {isRtl ? 'الكيان' : 'Entity'}
                                  </Label>
                                  <p className="font-medium">{getEntityBadge(log.entityType)}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">
                                    {isRtl ? 'الإجراء' : 'Action'}
                                  </Label>
                                  <p className="font-medium">{getActionBadge(log.action)}</p>
                                </div>
                              </div>

                              {log.previousValue && (
                                <div>
                                  <Label className="text-muted-foreground">
                                    {isRtl ? 'القيمة السابقة' : 'Previous Value'}
                                  </Label>
                                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                                    {JSON.stringify(log.previousValue, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.newValue && (
                                <div>
                                  <Label className="text-muted-foreground">
                                    {isRtl ? 'القيمة الجديدة' : 'New Value'}
                                  </Label>
                                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {log.ipAddress && (
                                <div>
                                  <Label className="text-muted-foreground">
                                    {isRtl ? 'عنوان IP' : 'IP Address'}
                                  </Label>
                                  <p className="font-mono text-sm">{log.ipAddress}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
