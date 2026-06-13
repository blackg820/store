'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from '@/hooks/use-translations'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { FileText, CheckCircle2, Eye, Download, Loader2 } from 'lucide-react'

interface Invoice {
  id: string
  invoice_id: string
  delivered_orders_count: number
  merchant_price: number
  total_price: number
  status: string
  created_at: string
}

export function AlWaseetInvoicesTable() {
  const { t } = useTranslations()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/v1/alwaseet/invoices')
      const json = await res.json()
      if (json.success) {
        setInvoices(json.data)
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReceive = async (invoiceId: string) => {
    setProcessingId(invoiceId)
    try {
      const res = await fetch(`/api/v1/alwaseet/invoices/${invoiceId}/receive`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success('Invoice marked as received')
        fetchInvoices()
      } else {
        toast.error(json.message || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to confirm receipt')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Invoices</CardTitle>
        <CardDescription>
          Review and confirm receipt of settled payments from Al-Waseet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Merchant Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell className="text-end"><Skeleton className="h-8 w-24 ms-auto" /></TableCell>
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.invoice_id}>
                    <TableCell className="font-mono font-medium">#{invoice.invoice_id}</TableCell>
                    <TableCell>{invoice.delivered_orders_count}</TableCell>
                    <TableCell className="font-semibold">{invoice.merchant_price.toLocaleString()} IQD</TableCell>
                    <TableCell>{invoice.total_price.toLocaleString()} IQD</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-end space-x-2">
                      <Button variant="ghost" size="sm" className="h-8">
                        <Eye className="h-3.5 w-3.5 me-1.5" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        disabled={processingId === invoice.invoice_id}
                        onClick={() => handleReceive(invoice.invoice_id)}
                      >
                        {processingId === invoice.invoice_id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 me-1.5" />
                        )}
                        Confirm
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
