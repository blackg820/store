'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Store, Package, Globe, ShoppingCart, Check, Minus, Plus, Loader2, Truck, Play, Video, AlertCircle } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { CartDrawer } from '@/components/store/cart-drawer'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getStorePath } from '@/lib/store-utils'

interface PublicStore {
  id: string
  name: string
  nameAr: string
  slug: string
  currency: string
  logoUrl?: string | null
  globalDiscount?: number
  deliveryDays?: number
  themeSettings?: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    fontFamily: string
  }
}

interface ProductOption {
  id: string
  name: string
  values: string[]
}

interface PublicProduct {
  id: string
  sku?: string | null
  title: string
  titleAr: string
  titleKu?: string
  description: string
  descriptionAr?: string
  descriptionKu?: string
  price: number
  discount: number
  needsDeposit?: boolean
  depositAmount?: number
  media: { id: string, url: string, type: string }[]
  options: ProductOption[]
  variants: any[]
}

export default function ProductClient({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>
}) {
  const resolvedParams = use(params)
  const [language, setLanguage] = useState<'en' | 'ar' | 'ku'>('ar')
  const [store, setStore] = useState<PublicStore | null>(null)
  const [product, setProduct] = useState<PublicProduct | null>(null)
  const [allProducts, setAllProducts] = useState<PublicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  
  const { addToCart } = useCart()

  const t = (key: string) => {
    const translations: any = {
      en: {
        needsDeposit: "Deposit Required",
        depositAmount: "Deposit Amount",
        onDelivery: "On Delivery"
      },
      ar: {
        needsDeposit: "مطلوب عربون",
        depositAmount: "مبلغ العربون",
        onDelivery: "عند الاستلام"
      },
      ku: {
        needsDeposit: "پێویستی بە پێشەکییە",
        depositAmount: "بڕی پێشەکی",
        onDelivery: "کاتی گەیشتن"
      }
    }
    return translations[language][key] || key
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/stores/${resolvedParams.slug}`)
        const data = await res.json()
        if (data.success && data.data) {
          setStore(data.data.store)
          const products = data.data.products || []
          setAllProducts(products)
          const found = products.find(
            (p: any) => String(p.id) === String(resolvedParams.productId)
          )
          setProduct(found || null)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [resolvedParams.slug, resolvedParams.productId])

  const toggleLanguage = () => {
    setLanguage(prev => {
      if (prev === 'ar') return 'ku'
      if (prev === 'ku') return 'en'
      return 'ar'
    })
  }

  const handleAddToCart = () => {
    if (!product || !store) return

    // Check if all options are selected
    const options = product.options || []
    for (const opt of options) {
      if (!selectedOptions[opt.name]) {
        toast.error(
          language === 'ar' 
            ? `يرجى اختيار ${opt.name}` 
            : language === 'ku' ? `تکایە هەڵبژێرە ${opt.name}` : `Please select ${opt.name}`
        )
        return
      }
    }

    const discountPercent = product.discount || store.globalDiscount || 0
    const finalPrice = product.price * (1 - discountPercent / 100)

    addToCart({
      productId: product.id,
      name: product.title,
      nameAr: product.titleAr,
      price: finalPrice,
      deliveryFee: (product as any).deliveryFee || 0,
      quantity,
      image: product.media[0]?.url || '/placeholder.svg',
      options: selectedOptions
    })
    
    toast.success(language === 'ar' ? 'تمت الإضافة إلى السلة' : language === 'ku' ? 'زیادکرا بۆ سەبەتە' : 'Added to cart')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!store || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === 'ar' ? 'المنتج غير موجود' : language === 'ku' ? 'بەرهەمەکە بوونی نییە' : 'Product Not Found'}
          </h1>
          <Button asChild>
            <Link href={getStorePath(resolvedParams.slug)}>
              {language === 'ar' ? 'العودة للمتجر' : language === 'ku' ? 'گەڕانەوە بۆ فرۆشگا' : 'Back to Store'}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const direction = language === 'en' ? 'ltr' : 'rtl'
  const isRTL = direction === 'rtl'
  const discountPercent = product.discount || store.globalDiscount || 0
  const hasDiscount = discountPercent > 0
  const finalPrice = product.price * (1 - discountPercent / 100)
  const productOptions = product.options || []

  return (
    <div className="min-h-screen font-cairo mesh-gradient" dir={direction}>
      <style jsx global>{`
        :root {
          --primary: ${store.themeSettings?.primaryColor || '#2563eb'};
          --accent: ${store.themeSettings?.accentColor || '#3b82f6'};
          --background: ${store.themeSettings?.backgroundColor || '#ffffff'};
        }
        .bg-primary { background-color: var(--primary) !important; }
        .text-primary { color: var(--primary) !important; }
        .border-primary { border-color: var(--primary) !important; }
        .ring-primary { --tw-ring-color: var(--primary) !important; }
        .bg-card-glass { background-color: rgba(255, 255, 255, 0.7) !important; backdrop-filter: blur(8px); }
        
        .mesh-gradient {
          background-color: var(--background);
          background-image: 
            radial-gradient(at 0% 0%, ${store.themeSettings?.primaryColor}15 0px, transparent 50%),
            radial-gradient(at 100% 0%, ${store.themeSettings?.accentColor}10 0px, transparent 50%),
            radial-gradient(at 100% 100%, ${store.themeSettings?.primaryColor}08 0px, transparent 50%),
            radial-gradient(at 0% 100%, ${store.themeSettings?.accentColor}12 0px, transparent 50%);
        }
      `}</style>
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href={getStorePath(store.slug)} className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center overflow-hidden border">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">
              {language === 'en' ? store.name : store.nameAr}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="rounded-full px-3">
              <Globe className="h-4 w-4 me-2" />
              <span className="text-xs font-bold uppercase">{language}</span>
            </Button>
            <CartDrawer storeSlug={store.slug} storeId={store.id} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Gallery */}
          <div className="space-y-4">
            <div className="aspect-square relative rounded-xl overflow-hidden bg-muted border">
              {product.media && product.media[activeImage] ? (
                product.media[activeImage].type === 'video' ? (
                  <video
                    src={product.media[activeImage].url}
                    className="h-full w-full object-contain bg-black"
                    controls
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={product.media[activeImage].url}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-20 w-20 text-muted-foreground" />
                </div>
              )}
              {hasDiscount && (
                <Badge className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} bg-destructive text-destructive-foreground text-lg px-3 py-1 shadow-md`}>
                  -{discountPercent}%
                </Badge>
              )}
            </div>
            
            {product.media && product.media.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.media.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      "h-20 w-20 rounded-md overflow-hidden border-2 shrink-0 transition-all bg-muted",
                      activeImage === i ? "border-primary" : "border-transparent opacity-60"
                    )}
                  >
                    {img.type === 'video' ? (
                      <div className="h-full w-full relative">
                        <video 
                          src={`${img.url}#t=0.1`} 
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Play className="h-6 w-6 text-white drop-shadow-md" />
                        </div>
                      </div>
                    ) : (
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.sku && (
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Code: {product.sku}
                </div>
              )}
              <h1 className="text-3xl font-bold">
                {language === 'en' 
                  ? product.title 
                  : language === 'ku' 
                    ? product.titleKu || product.title 
                    : product.titleAr || product.title}
              </h1>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">{finalPrice.toLocaleString()} {language === 'en' ? 'IQD' : 'د.ع'}</span>
                {hasDiscount && (
                  <span className="text-xl text-muted-foreground line-through">{product.price.toLocaleString()} {language === 'en' ? 'IQD' : 'د.ع'}</span>
                )}
              </div>
              {product.needsDeposit && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 px-3 py-1 rounded-full text-xs font-bold">
                    {t('needsDeposit')}
                  </Badge>
                  <span className="text-sm font-bold text-primary/80">
                    {product.depositAmount?.toLocaleString()} {language === 'en' ? 'IQD' : 'د.ع'}
                  </span>
                </div>
              )}
            </div>

            <div className="text-muted-foreground leading-relaxed">
              {language === 'en' 
                ? product.description 
                : language === 'ku' 
                  ? product.descriptionKu || product.description 
                  : product.descriptionAr || product.description}
            </div>

            {/* Product Options */}
            {productOptions.length > 0 && (
              <div className="space-y-6 py-4 border-t border-b border-border">
                {productOptions.map((option) => (
                  <div key={option.name} className="space-y-3">
                    <Label className="text-base font-bold">{option.name}</Label>
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((val) => {
                        const swatch = (option as any).swatches?.[val]
                        return (
                          <Button
                            key={val}
                            variant={selectedOptions[option.name] === val ? "default" : "outline"}
                            className={cn(
                              "h-10 px-4 transition-all relative overflow-hidden",
                              selectedOptions[option.name] === val && "ring-2 ring-primary ring-offset-2",
                              swatch && "w-10 px-0 rounded-full"
                            )}
                            title={val}
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: val }))}
                          >
                            {swatch ? (
                              <div 
                                className="w-full h-full border border-black/10 rounded-full flex items-center justify-center" 
                                style={{ backgroundColor: swatch }}
                              >
                                {selectedOptions[option.name] === val && (
                                  <Check className={cn("h-4 w-4", (swatch === '#FFFFFF' || swatch.toLowerCase() === 'white') ? "text-black" : "text-white")} />
                                )}
                              </div>
                            ) : val}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <Label className="text-base font-bold">{language === 'ar' ? 'الكمية' : language === 'ku' ? 'بڕ' : 'Quantity'}</Label>
                <div className="flex items-center border rounded-lg h-12 bg-muted/50">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-full rounded-none"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-bold text-lg">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-full rounded-none"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  className="flex-1 h-14 text-lg font-bold shadow-lg shadow-primary/20"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {language === 'ar' ? 'إضافة إلى السلة' : language === 'ku' ? 'زیادکردن بۆ سەبەتە' : 'Add to Cart'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card-glass border border-white/20">
                <Truck className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'التوصيل' : language === 'ku' ? 'گەیاندن' : 'Delivery'}</p>
                  <p className="text-sm font-bold">
                    {store.deliveryDays} {language === 'ar' ? 'أيام' : language === 'ku' ? 'ڕۆژ' : 'days'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card-glass border border-white/20">
                {product.needsDeposit ? (
                  <AlertCircle className="h-6 w-6 text-primary" />
                ) : (
                  <Check className="h-6 w-6 text-primary" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الدفع' : language === 'ku' ? 'پارەدان' : 'Payment'}</p>
                  <p className="text-sm font-bold">
                    {product.needsDeposit ? t('needsDeposit') : t('onDelivery')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {allProducts.length > 1 && (
          <div className="mt-20 space-y-8">
            <div className="flex items-center gap-3 border-b pb-4">
              <h2 className="text-2xl font-bold">
                {language === 'ar' ? 'منتجات قد تعجبك' : language === 'ku' ? 'بەرهەمە پێشنیارکراوەکان' : 'Related Products'}
              </h2>
            </div>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {allProducts
                .filter(p => p.id !== product.id)
                .slice(0, 4)
                .map((p) => {
                  const pDiscount = p.discount || store.globalDiscount || 0
                  const pFinalPrice = p.price * (1 - pDiscount / 100)
                  return (
                    <Link key={p.id} href={getStorePath(store.slug, `/product/${p.id}`)} className="group">
                      <Card className="h-full overflow-hidden hover:shadow-md transition-all border-muted">
                        <div className="aspect-square relative bg-muted">
                          {p.media?.[0] ? (
                            p.media[0].type === 'video' ? (
                              <div className="h-full w-full relative">
                                <video 
                                  src={`${p.media[0].url}#t=0.1`} 
                                  className="h-full w-full object-cover"
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <Play className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <img src={p.media[0].url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-all" />
                            )
                          ) : (
                            <div className="h-full w-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold line-clamp-1 group-hover:text-primary transition-colors">
                            {language === 'en' ? p.title : language === 'ku' ? p.titleKu || p.title : p.titleAr || p.title}
                          </h3>
                          <p className="text-primary font-bold mt-2">{pFinalPrice.toLocaleString()} {language === 'en' ? 'IQD' : 'د.ع'}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'ar' ? 'جميع الحقوق محفوظة © 2026' : language === 'ku' ? 'هەموو مافەکان پارێزراوە © ٢٠٢٦' : 'All rights reserved © 2026'}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
            <Store className="h-4 w-4" />
            <span className="font-semibold">{language === 'en' ? store.name : store.nameAr}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
