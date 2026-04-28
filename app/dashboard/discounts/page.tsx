'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { DashboardHeader } from '@/components/dashboard/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Percent, Store as StoreIcon, Package, Trash2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DiscountsPage() {
  const { user, language } = useAuth()
  const { stores, products, updateStore, updateProduct } = useData()
  const [storeDialog, setStoreDialog] = useState(false)
  const [productDialog, setProductDialog] = useState(false)
  const [editingStore, setEditingStore] = useState<string>('')
  const [editingProduct, setEditingProduct] = useState<string>('')
  const [discountValue, setDiscountValue] = useState<string>('')
  const [discountEnd, setDiscountEnd] = useState<string>('')

  const isAdmin = user?.role === 'admin'
  const userStores = isAdmin ? stores : stores.filter((s) => s.userId === user?.id)
  const storeIds = userStores.map((s) => s.id)
  const userProducts = products.filter((p) => storeIds.includes(p.storeId))

  const activeStoreDiscounts = userStores.filter(
    (s) =>
      s && s.id &&
      s.globalDiscount &&
      s.globalDiscount > 0 &&
      (!s.globalDiscountEndDate || new Date(s.globalDiscountEndDate) > new Date())
  )
  const activeProductDiscounts = userProducts.filter(
    (p) =>
      p && p.id &&
      p.discount &&
      p.discount > 0
  )

  const handleSetStoreDiscount = () => {
    if (!editingStore || !discountValue) return
    const value = parseFloat(discountValue)
    if (isNaN(value) || value < 0 || value > 100) {
      toast.error(
        language === 'ar'
          ? 'الخصم يجب أن يكون بين 0 و 100'
          : 'Discount must be between 0 and 100'
      )
      return
    }
    updateStore(editingStore, {
      globalDiscount: value,
      globalDiscountEndDate: discountEnd || undefined,
    })
    toast.success(language === 'ar' ? 'تم تطبيق الخصم' : 'Discount applied')
    setStoreDialog(false)
    setEditingStore('')
    setDiscountValue('')
    setDiscountEnd('')
  }

  const handleSetProductDiscount = () => {
    if (!editingProduct || !discountValue) return
    const value = parseFloat(discountValue)
    if (isNaN(value) || value < 0 || value > 100) {
      toast.error(
        language === 'ar'
          ? 'الخصم يجب أن يكون بين 0 و 100'
          : 'Discount must be between 0 and 100'
      )
      return
    }
    updateProduct(editingProduct, {
      discount: value,
    })
    toast.success(language === 'ar' ? 'تم تطبيق الخصم' : 'Discount applied')
    setProductDialog(false)
    setEditingProduct('')
    setDiscountValue('')
    setDiscountEnd('')
  }

  const removeStoreDiscount = (storeId: string) => {
    updateStore(storeId, { globalDiscount: undefined, globalDiscountEndDate: undefined })
    toast.success(language === 'ar' ? 'تم إلغاء الخصم' : 'Discount removed')
  }

  const removeProductDiscount = (productId: string) => {
    updateProduct(productId, { discount: undefined })
    toast.success(language === 'ar' ? 'تم إلغاء الخصم' : 'Discount removed')
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title={language === 'ar' ? 'الخصومات' : 'Discounts'} />

      <div className="p-4 md:p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? 'خصومات المتاجر النشطة' : 'Active Store Discounts'}
              </CardTitle>
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStoreDiscounts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {language === 'ar' ? 'خصومات المنتجات النشطة' : 'Active Product Discounts'}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProductDiscounts.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Store-Wide Discounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {language === 'ar' ? 'خصومات على مستوى المتجر' : 'Store-Wide Discounts'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'خصم مطبق على جميع المنتجات في المتجر'
                  : 'Discount applied to all products in a store'}
              </CardDescription>
            </div>
            <Dialog open={storeDialog} onOpenChange={setStoreDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Percent className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'إضافة خصم' : 'Add Discount'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'خصم متجر جديد' : 'New Store Discount'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{language === 'ar' ? 'المتجر' : 'Store'}</Label>
                    <Select value={editingStore} onValueChange={setEditingStore}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'اختر متجر' : 'Select store'} />
                      </SelectTrigger>
                      <SelectContent>
                        {userStores.filter(s => s && s.id).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {language === 'ar' ? s.nameAr || s.name : s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'النسبة المئوية' : 'Percentage (%)'}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <Label>
                      {language === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'End Date (optional)'}
                    </Label>
                    <Input
                      type="date"
                      value={discountEnd}
                      onChange={(e) => setDiscountEnd(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStoreDialog(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSetStoreDiscount}>
                    {language === 'ar' ? 'تطبيق' : 'Apply'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المتجر' : 'Store'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الخصم' : 'Discount'}</TableHead>
                  <TableHead>{language === 'ar' ? 'ينتهي في' : 'Expires'}</TableHead>
                  <TableHead className="text-end">
                    {language === 'ar' ? 'إجراءات' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStoreDiscounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {language === 'ar' ? 'لا توجد خصومات نشطة' : 'No active discounts'}
                    </TableCell>
                  </TableRow>
                ) : (
                  activeStoreDiscounts.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {language === 'ar' ? s.nameAr : s.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.globalDiscount}%</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.globalDiscountEndDate
                          ? new Date(s.globalDiscountEndDate).toLocaleDateString()
                          : language === 'ar'
                            ? 'لا ينتهي'
                            : 'Never'}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStoreDiscount(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Product-Specific Discounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {language === 'ar' ? 'خصومات المنتجات' : 'Product Discounts'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'خصم مطبق على منتج محدد'
                  : 'Discount applied to a specific product'}
              </CardDescription>
            </div>
            <Dialog open={productDialog} onOpenChange={setProductDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Percent className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'إضافة خصم' : 'Add Discount'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'خصم منتج جديد' : 'New Product Discount'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{language === 'ar' ? 'المنتج' : 'Product'}</Label>
                    <Select value={editingProduct} onValueChange={setEditingProduct}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={language === 'ar' ? 'اختر منتج' : 'Select product'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {userProducts.filter(p => p && p.id).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {language === 'ar' ? p.titleAr || p.title : p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'النسبة المئوية' : 'Percentage (%)'}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <Label>
                      {language === 'ar' ? 'تاريخ الانتهاء (اختياري)' : 'End Date (optional)'}
                    </Label>
                    <Input
                      type="date"
                      value={discountEnd}
                      onChange={(e) => setDiscountEnd(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setProductDialog(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSetProductDiscount}>
                    {language === 'ar' ? 'تطبيق' : 'Apply'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                  <TableHead>{language === 'ar' ? 'السعر الأصلي' : 'Original Price'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الخصم' : 'Discount'}</TableHead>
                  <TableHead>{language === 'ar' ? 'السعر بعد الخصم' : 'Sale Price'}</TableHead>
                  <TableHead>{language === 'ar' ? 'ينتهي في' : 'Expires'}</TableHead>
                  <TableHead className="text-end">
                    {language === 'ar' ? 'إجراءات' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeProductDiscounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {language === 'ar' ? 'لا توجد خصومات نشطة' : 'No active discounts'}
                    </TableCell>
                  </TableRow>
                ) : (
                  activeProductDiscounts.map((p) => {
                    const sale = p.price * (1 - (p.discount ?? 0) / 100)
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {language === 'ar' ? p.titleAr : p.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground line-through">
                          ${p.price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.discount}%</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-accent">
                          ${sale.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {language === 'ar'
                              ? 'لا ينتهي'
                              : 'Never'}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProductDiscount(p.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
