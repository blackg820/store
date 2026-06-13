'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
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
import { AccessRestricted } from '@/components/dashboard/access-restricted'

export default function DiscountsPage() {
  const { user, language } = useAuth()
  const { stores, products, updateStore, updateProduct, selectedStoreId, getStoresByUserId } = useData()
  const [storeDialog, setStoreDialog] = useState(false)
  const [productDialog, setProductDialog] = useState(false)
  const [editingStore, setEditingStore] = useState<string>(selectedStoreId || '')
  const [editingProduct, setEditingProduct] = useState<string>('')
  const [discountValue, setDiscountValue] = useState<string>('')
  const [discountEnd, setDiscountEnd] = useState<string>('')

  const isAdmin = user?.role === 'admin'

  if (user?.role === 'employee') {
    return (
      <AccessRestricted description="Discount management is restricted to store owners and platform admins." />
    )
  }

  let userStores = isAdmin ? stores : getStoresByUserId(user?.id || '')

  if (selectedStoreId) {
    userStores = userStores.filter(s => s.id === selectedStoreId)
  }

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
    <div className="space-y-12 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground font-heading">
            {language === 'ar' ? 'الخصومات' : 'Discounts'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Manage promotional campaigns, store-wide sales, and targeted product markdowns.
            Boost conversions with time-sensitive offers.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-top-4 duration-700">
        <Card className="border-none shadow-xl shadow-primary/5 bg-card/30 backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.03] transition-all duration-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              {language === 'ar' ? 'خصومات المتاجر النشطة' : 'Active Store Discounts'}
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              <StoreIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="text-4xl font-black tracking-tighter">{activeStoreDiscounts.length}</div>
            <p className="text-xs font-medium text-muted-foreground mt-2 opacity-60">Global campaigns</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-primary/5 bg-card/30 backdrop-blur-sm rounded-[2rem] overflow-hidden group hover:scale-[1.03] transition-all duration-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              {language === 'ar' ? 'خصومات المنتجات النشطة' : 'Active Product Discounts'}
            </CardTitle>
            <div className="h-10 w-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              <Package className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="text-4xl font-black tracking-tighter">{activeProductDiscounts.length}</div>
            <p className="text-xs font-medium text-muted-foreground mt-2 opacity-60">Specific items</p>
          </CardContent>
        </Card>
      </div>

        {/* Store-Wide Discounts */}
        <Card className="border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">
                {language === 'ar' ? 'خصومات على مستوى المتجر' : 'Store-Wide Discounts'}
              </CardTitle>
              <CardDescription className="text-sm font-medium">
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
                            {s.name}
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
                        {s.name}
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
        <Card className="border-none shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-sm rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">
                {language === 'ar' ? 'خصومات المنتجات' : 'Product Discounts'}
              </CardTitle>
              <CardDescription className="text-sm font-medium">
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
                            {p.title}
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
                          {p.title}
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
  )
}
