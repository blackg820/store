'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import type { Buyer, BuyerRisk } from '@/lib/types'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { MoreHorizontal, Search, Plus, Eye, Edit, Ban, ShieldCheck, AlertTriangle, Download, Phone, MapPin } from 'lucide-react'

const riskColors: Record<BuyerRisk, string> = {
  low: 'bg-success/10 text-success border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
}

export function BuyersTable() {
  const { language } = useAuth()
  const { t } = useTranslations()
  const { buyers, addBuyer, updateBuyer, blacklistBuyer } = useData()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [riskFilter, setRiskFilter] = useState<BuyerRisk | 'all' | 'blacklisted'>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    governorate: '',
    district: '',
    landmark: '',
  })

  let filteredBuyers = buyers

  if (riskFilter === 'blacklisted') {
    filteredBuyers = filteredBuyers.filter(b => b.isBlacklisted)
  } else if (riskFilter !== 'all') {
    filteredBuyers = filteredBuyers.filter(b => b.riskScore === riskFilter && !b.isBlacklisted)
  }

  if (searchQuery) {
    filteredBuyers = filteredBuyers.filter(b => 
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.phone.includes(searchQuery) ||
      b.governorate.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const resetForm = () => {
    setFormData({
      phone: '',
      name: '',
      governorate: '',
      district: '',
      landmark: '',
    })
  }

  const handleAdd = () => {
    addBuyer({
      phone: formData.phone,
      name: formData.name,
      governorate: formData.governorate,
      district: formData.district,
      landmark: formData.landmark,
      isBlacklisted: false,
    })
    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleView = (buyer: Buyer) => {
    setSelectedBuyer(buyer)
    setIsViewDialogOpen(true)
  }

  const handleBlacklist = (buyerId: string, blacklist: boolean) => {
    blacklistBuyer(buyerId, blacklist)
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Governorate', 'District', 'Total Orders', 'Rejected Orders', 'Risk Score', 'Blacklisted']
    const rows = filteredBuyers.map(buyer => [
      buyer.name,
      buyer.phone,
      buyer.governorate,
      buyer.district,
      buyer.totalOrders,
      buyer.rejectedOrders,
      buyer.riskScore,
      buyer.isBlacklisted ? 'Yes' : 'No',
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'buyers.csv'
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 w-full sm:w-64"
            />
          </div>
          <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as BuyerRisk | 'all' | 'blacklisted')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder={t('filter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buyers</SelectItem>
              <SelectItem value="low">{t('lowRisk')}</SelectItem>
              <SelectItem value="medium">{t('mediumRisk')}</SelectItem>
              <SelectItem value="high">{t('highRisk')}</SelectItem>
              <SelectItem value="blacklisted">{t('blacklisted')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 me-2" />
            {t('export')}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 me-2" />
                {t('add')} Buyer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('add')} Buyer</DialogTitle>
                <DialogDescription>
                  Add a new buyer to the system
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('name')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('phone')}</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+20..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="governorate">Governorate</Label>
                    <Input
                      id="governorate"
                      value={formData.governorate}
                      onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="landmark">Nearest Landmark</Label>
                  <Input
                    id="landmark"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleAdd}>{t('save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Buyer</TableHead>
              <TableHead>{t('phone')}</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-center">{t('orders')}</TableHead>
              <TableHead className="text-center">Rejected</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead className="text-end">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBuyers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t('noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredBuyers.map((buyer) => {
                const rejectionRate = buyer.totalOrders > 0 
                  ? ((buyer.rejectedOrders / buyer.totalOrders) * 100).toFixed(0)
                  : '0'

                return (
                  <TableRow key={buyer.id} className={cn(buyer.isBlacklisted && 'bg-destructive/5')}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {buyer.riskScore === 'high' && !buyer.isBlacklisted && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <p className="font-medium">{buyer.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{buyer.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm">{buyer.governorate}</p>
                          <p className="text-xs text-muted-foreground">{buyer.district}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{buyer.totalOrders}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        'font-medium',
                        buyer.rejectedOrders > 0 && 'text-destructive'
                      )}>
                        {buyer.rejectedOrders}
                      </span>
                      <span className="text-xs text-muted-foreground ms-1">({rejectionRate}%)</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('capitalize', riskColors[buyer.riskScore])}>
                        {t(`${buyer.riskScore}Risk` as 'lowRisk' | 'mediumRisk' | 'highRisk')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {buyer.isBlacklisted ? (
                        <Badge variant="destructive">{t('blacklisted')}</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          {t('active')}
                        </Badge>
                      )}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleView(buyer)}>
                            <Eye className="h-4 w-4 me-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {buyer.isBlacklisted ? (
                            <DropdownMenuItem onClick={() => handleBlacklist(buyer.id, false)}>
                              <ShieldCheck className="h-4 w-4 me-2" />
                              Remove from Blacklist
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={() => handleBlacklist(buyer.id, true)}
                              className="text-destructive"
                            >
                              <Ban className="h-4 w-4 me-2" />
                              Add to Blacklist
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buyer Details</DialogTitle>
          </DialogHeader>
          {selectedBuyer && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t('name')}</Label>
                  <p className="font-medium">{selectedBuyer.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t('phone')}</Label>
                  <p className="font-mono">{selectedBuyer.phone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Governorate</Label>
                  <p>{selectedBuyer.governorate}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">District</Label>
                  <p>{selectedBuyer.district}</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-muted-foreground">Nearest Landmark</Label>
                  <p>{selectedBuyer.landmark}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Orders</Label>
                  <p className="font-bold">{selectedBuyer.totalOrders}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Rejected Orders</Label>
                  <p className={cn('font-bold', selectedBuyer.rejectedOrders > 0 && 'text-destructive')}>
                    {selectedBuyer.rejectedOrders}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Risk Score</Label>
                  <Badge variant="outline" className={cn('capitalize', riskColors[selectedBuyer.riskScore])}>
                    {selectedBuyer.riskScore}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{t('status')}</Label>
                  {selectedBuyer.isBlacklisted ? (
                    <Badge variant="destructive">{t('blacklisted')}</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      {t('active')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
