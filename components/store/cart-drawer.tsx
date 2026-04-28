'use client'

import { useCart } from '@/lib/cart-context'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShoppingCart, Trash2, Minus, Plus, Package, User, LogIn, UserPlus, LogOut, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { validatePhone } from '@/lib/order-utils'
import { cn } from '@/lib/utils'

export function CartDrawer({ storeSlug, storeId }: { storeSlug?: string, storeId?: string }) {
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart()
  const { language } = useAuth()
  const { t } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Buyer Auth State
  const [buyer, setBuyer] = useState<any>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [authData, setAuthData] = useState({
    phone: '',
    password: '',
    name: '',
    email: '',
    governorate: '',
    district: '',
    landmark: ''
  })

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    governorate: '',
    district: '',
    landmark: '',
    notes: '',
  })
  const [storeData, setStoreData] = useState<any>(null)

  // Load buyer from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('storify_buyer')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setBuyer(parsed.buyer)
        setFormData(prev => ({
          ...prev,
          name: parsed.buyer.name,
          phone: parsed.buyer.phone,
          governorate: parsed.buyer.governorate,
          district: parsed.buyer.district,
          landmark: parsed.buyer.landmark || ''
        }))
      } catch (e) {}
    }

    // Fetch store data for WhatsApp number
    if (storeSlug) {
      fetch(`/api/stores/${storeSlug}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setStoreData(data.data.store)
        })
        .catch(console.error)
    }
  }, [storeSlug])

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAuth = async () => {
    if (!authData.phone || !authData.password) {
      toast.error('Phone and password are required')
      return
    }

    setAuthLoading(true)
    try {
      const res = await fetch('/api/v1/buyers/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: authMode,
          ...authData
        })
      })

      const result = await res.json()
      if (result.success) {
        toast.success(result.message)
        setBuyer(result.data.buyer)
        localStorage.setItem('storify_buyer', JSON.stringify(result.data))
        
        // Auto-fill form
        setFormData(prev => ({
          ...prev,
          name: result.data.buyer.name,
          phone: result.data.buyer.phone,
          governorate: result.data.buyer.governorate,
          district: result.data.buyer.district,
          landmark: result.data.buyer.landmark || ''
        }))
        setShowAuth(false)
      } else {
        toast.error(result.error)
      }
    } catch (e) {
      toast.error('Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setBuyer(null)
    localStorage.removeItem('storify_buyer')
    toast.success('Logged out successfully')
  }

  const handleCheckout = async () => {
    if (!formData.name || !formData.phone || !formData.governorate || !formData.district) {
      toast.error(t('fillRequired' as any))
      return
    }

    if (!validatePhone(formData.phone)) {
      toast.error(t('invalidPhone' as any))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeSlug,
          storeId,
          buyerName: formData.name,
          buyerPhone: formData.phone,
          governorate: formData.governorate,
          district: formData.district,
          landmark: formData.landmark,
          notes: formData.notes,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            options: item.options
          }))
        })
      })

      const result = await res.json()
      if (result.success) {
        toast.success(t('orderSuccess' as any))
        
        // WhatsApp Integration
        if (storeData?.whatsappNumber) {
          const itemsText = items.map(item => 
            `- ${language === 'en' ? item.name : item.nameAr} x${item.quantity} (${item.price.toLocaleString()} ${currencySymbol})`
          ).join('%0A')
          
          const totalWithDelivery = totalPrice + totalDeliveryFee
          
          const message = `*طلب جديد من متجر ${storeData.nameAr || storeData.name}*%0A%0A` +
            `*الزبون:* ${formData.name}%0A` +
            `*الهاتف:* ${formData.phone}%0A` +
            `*العنوان:* ${formData.governorate} - ${formData.district}${formData.landmark ? ` (${formData.landmark})` : ''}%0A%0A` +
            `*المنتجات:*%0A${itemsText}%0A%0A` +
            `*سعر المنتجات:* ${totalPrice.toLocaleString()} ${currencySymbol}%0A` +
            `*سعر التوصيل:* ${totalDeliveryFee.toLocaleString()} ${currencySymbol}%0A` +
            `*المجموع الكلي:* ${totalWithDelivery.toLocaleString()} ${currencySymbol}%0A%0A` +
            (formData.notes ? `*ملاحظات:* ${formData.notes}%0A%0A` : '') +
            `رقم الطلب: ${result.orderGroupId}`

          const cleanPhone = storeData.whatsappNumber.replace(/\D/g, '')
          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`
          
          // Use location.href for better mobile compatibility (avoiding popup blockers)
          window.location.href = whatsappUrl
        }

        clearCart()
        setIsOpen(false)
        setIsCheckingOut(false)
      } else {
        toast.error(result.error || t('error'))
      }
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const currencySymbol = language === 'ar' ? 'د.ع' : 'IQD'
  const isRTL = language === 'ar' || language === 'ku'
  const { totalDeliveryFee } = useCart()

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-11 w-11 rounded-full border-primary/20 shadow-sm hover:shadow-md transition-all">
          <ShoppingCart className="h-5 w-5 text-primary" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              {totalItems}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-s-0 sm:border-s" side={isRTL ? 'left' : 'right'}>
        <SheetHeader className="p-6 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              {isCheckingOut ? t('checkout' as any) : t('shoppingCart' as any)}
            </SheetTitle>
            {buyer ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs gap-2">
                <LogOut className="h-3 w-3" />
                {buyer.name}
              </Button>
            ) : !isCheckingOut && (
              <Button variant="ghost" size="sm" onClick={() => { setShowAuth(true); setIsCheckingOut(true); }} className="text-xs gap-2 text-primary">
                <LogIn className="h-3 w-3" />
                {language === 'ar' ? 'دخول' : 'Login'}
              </Button>
            )}
          </div>
          <SheetDescription>
            {isCheckingOut 
              ? t('completeOrderDetails')
              : t('itemsInCart').replace('{{count}}', String(totalItems))}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {isCheckingOut ? (
            <ScrollArea className="h-full p-6">
              {showAuth ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold">{authMode === 'login' ? t('loginToStorify') : t('createAccount')}</h3>
                    <p className="text-sm text-muted-foreground">{t('saveDetailsDesc')}</p>
                  </div>
                  
                  <div className="space-y-4">
                    {authMode === 'register' && (
                      <div className="space-y-2">
                        <Label>{t('fullName')}</Label>
                        <Input 
                          placeholder={t('yourName')}
                          value={authData.name}
                          onChange={(e) => setAuthData({...authData, name: e.target.value})}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>{t('phone')}</Label>
                      <Input 
                        placeholder="07XXXXXXXX"
                        value={authData.phone}
                        onChange={(e) => setAuthData({...authData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('password')}</Label>
                      <Input 
                        type="password"
                        placeholder="••••••••"
                        value={authData.password}
                        onChange={(e) => setAuthData({...authData, password: e.target.value})}
                      />
                    </div>
                    {authMode === 'register' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('governorate')}</Label>
                          <Input 
                            placeholder={language === 'ar' ? 'بغداد' : 'Baghdad'}
                            value={authData.governorate}
                            onChange={(e) => setAuthData({...authData, governorate: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('district')}</Label>
                          <Input 
                            placeholder={language === 'ar' ? 'الكرادة' : 'Karrada'}
                            value={authData.district}
                            onChange={(e) => setAuthData({...authData, district: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                    
                    <Button className="w-full h-12 font-bold" onClick={handleAuth} disabled={authLoading}>
                      {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (authMode === 'login' ? t('login') : t('createAccount'))}
                    </Button>
                    
                    <div className="text-center">
                      <button 
                        className="text-sm text-primary hover:underline"
                        onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                      >
                        {authMode === 'login' ? t('registerNow') : t('alreadyHaveAccount')}
                      </button>
                    </div>
                    
                    <Button variant="ghost" className="w-full text-xs" onClick={() => setShowAuth(false)}>
                      {t('continueAsGuest')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('fullName' as any)} *</Label>
                    <Input 
                      placeholder={language === 'ar' ? 'مثال: محمد أحمد' : 'e.g. John Doe'}
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('phone')} *</Label>
                    <Input 
                      placeholder="07XXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('governorate' as any)} *</Label>
                      <Input 
                        placeholder={language === 'ar' ? 'مثال: بغداد' : 'e.g. Baghdad'}
                        value={formData.governorate}
                        onChange={(e) => updateField('governorate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('district' as any)} *</Label>
                      <Input 
                        placeholder={language === 'ar' ? 'مثال: الكرادة' : 'e.g. Karrada'}
                        value={formData.district}
                        onChange={(e) => updateField('district', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('landmark' as any)}</Label>
                    <Input 
                      placeholder={language === 'ar' ? 'مثال: قرب جامع ...' : 'e.g. Near ... Mosque'}
                      value={formData.landmark}
                      onChange={(e) => updateField('landmark', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('additionalNotes' as any)}</Label>
                    <Textarea 
                      placeholder={language === 'ar' ? 'أي تعليمات خاصة للتوصيل' : 'Any special instructions'}
                      value={formData.notes}
                      onChange={(e) => updateField('notes', e.target.value)}
                      className="resize-none"
                    />
                  </div>
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t('productsPrice')}</span>
                      <span>{totalPrice.toLocaleString()} {currencySymbol}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{t('deliveryFee')}</span>
                      <span>{totalDeliveryFee === 0 ? t('free') : `${totalDeliveryFee.toLocaleString()} ${currencySymbol}`}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>{t('totalPrice' as any)}</span>
                      <span className="text-primary">{(totalPrice + totalDeliveryFee).toLocaleString()} {currencySymbol}</span>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 pt-20">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-xl">{t('cartEmpty' as any)}</p>
                    <p className="text-muted-foreground">{t('startAdding' as any)}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0 border shadow-sm">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold line-clamp-1 group-hover:text-primary transition-colors">{language === 'en' ? item.name : item.nameAr}</p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {item.options && Object.entries(item.options).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.options).map(([k, v]) => (
                              <span key={k} className="text-[10px] bg-muted px-2 py-0.5 rounded-full border font-medium">
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2">
                          <p className="font-bold text-primary">{item.price.toLocaleString()} {currencySymbol}</p>
                          <div className="flex items-center border rounded-full bg-background overflow-hidden h-8">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-full w-8 rounded-none"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-full w-8 rounded-none"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {items.length > 0 && !showAuth && (
          <SheetFooter className="p-6 border-t block bg-muted/10">
            {!isCheckingOut ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t('total')}</span>
                    <span>{totalPrice.toLocaleString()} {currencySymbol}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{language === 'ar' ? 'التوصيل' : 'Delivery'}</span>
                    <span>{totalDeliveryFee === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : `${totalDeliveryFee.toLocaleString()} ${currencySymbol}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xl pt-1">
                    <span>{t('total')}</span>
                    <span className="text-primary">{(totalPrice + totalDeliveryFee).toLocaleString()} {currencySymbol}</span>
                  </div>
                </div>
                <Button className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20" onClick={() => setIsCheckingOut(true)}>
                  {t('checkout')}
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 font-bold" 
                  onClick={() => setIsCheckingOut(false)}
                  disabled={isSubmitting}
                >
                  {t('back' as any)}
                </Button>
                <Button 
                  className="flex-[2] h-12 font-bold" 
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('confirmOrder' as any)}
                </Button>
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
