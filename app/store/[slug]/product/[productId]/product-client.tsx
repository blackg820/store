'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Store, Package, Globe, ShoppingCart, Check, Minus, Plus,
  Truck, Play, AlertCircle, Heart,
  ChevronLeft, ChevronRight, ShieldCheck, Zap
} from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { CartDrawer } from '@/components/store/cart-drawer'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getStorePath } from '@/lib/store-utils'
import { translations } from '@/lib/types'

type StoreLanguage = 'en' | 'ar' | 'ku'

export interface PublicStore {
  id: string
  name: string
  slug: string
  currency: string
  logoUrl?: string | null
  status?: string | null
  isOpen?: boolean | null
  checkoutEnabled?: boolean | null
  defaultLanguage?: StoreLanguage | null
  globalDiscount?: number
  deliveryDays?: number
  themeSettings?: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    fontFamily: string
  }
}

export interface ProductOption {
  id: string
  name: string
  values: string[]
  type?: string
  swatches?: Record<string, string>
}

export interface PublicProductVariant {
  id?: string
  stockQuantity?: number
  stock_quantity?: number
  priceOverride?: number | null
  price_override?: number | null
  isActive?: boolean
  is_active?: boolean
  optionValues?: Record<string, string> | string | null
  option_values?: Record<string, string> | string | null
}

export interface PublicProduct {
  id: string
  storeId?: string | number | null
  sku?: string | null
  title: string
  description: string
  price: number
  discount: number
  needsDeposit?: boolean
  depositAmount?: number
  deliveryFee?: number
  media: { id: string, url: string, type: string }[]
  imageUrl?: string | null
  store?: PublicStore | null
  options: ProductOption[]
  variants: PublicProductVariant[]
}

function normalizeLanguage(language?: string | null): StoreLanguage {
  return language === 'en' || language === 'ar' || language === 'ku' ? language : 'ar'
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeProduct(product: PublicProduct | null | undefined): PublicProduct | null {
  if (!product) return null

  return {
    ...product,
    title: product.title || '',
    description: product.description || '',
    price: toNumber(product.price),
    discount: toNumber(product.discount),
    depositAmount: toNumber(product.depositAmount),
    deliveryFee: toNumber(product.deliveryFee),
    media: asArray(product.media),
    options: asArray(product.options).map((option) => ({
      ...option,
      name: option.name || '',
      values: asArray(option.values),
      swatches: option.swatches || {},
    })).filter((option) => option.name),
    variants: asArray(product.variants),
  }
}

function parseOptionValues(value: PublicProductVariant['optionValues'] | PublicProductVariant['option_values']) {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.fromEntries(Object.entries(parsed).map(([key, option]) => [key, String(option)]))
      }
    } catch {
      return {}
    }
  }

  return Object.fromEntries(Object.entries(value).map(([key, option]) => [key, String(option)]))
}

function findMatchingVariant(product: PublicProduct, selectedOptions: Record<string, string>) {
  const selectedEntries = Object.entries(selectedOptions)
  if (selectedEntries.length === 0) return null

  return product.variants?.find((variant) => {
    const optionValues = parseOptionValues(variant.optionValues ?? variant.option_values)
    return selectedEntries.every(([key, value]) => optionValues[key] === value)
  }) || null
}

function getVariantStock(variant: PublicProductVariant | null) {
  if (!variant) return null
  return Number(variant.stockQuantity ?? variant.stock_quantity ?? 0)
}

function isCheckoutOpen(store: PublicStore) {
  const statusAllowsCheckout = store.status ? store.status === 'active' : true
  return (store.checkoutEnabled ?? true) && (store.isOpen ?? statusAllowsCheckout)
}

export default function ProductClient({
  params,
  initialStore = null,
  initialProduct = null,
  initialProducts = [],
  initialLoadComplete = false,
}: {
  params: { slug: string; productId: string }
  initialStore?: PublicStore | null
  initialProduct?: PublicProduct | null
  initialProducts?: PublicProduct[]
  initialLoadComplete?: boolean
}) {
  const resolvedParams = params
  const [language, setLanguage] = useState<StoreLanguage>(() => normalizeLanguage(initialStore?.defaultLanguage))
  const [store, setStore] = useState<PublicStore | null>(initialStore)
  const [product, setProduct] = useState<PublicProduct | null>(() => normalizeProduct(initialProduct))
  const [allProducts, setAllProducts] = useState<PublicProduct[]>(() => asArray(initialProducts).map(normalizeProduct).filter((item): item is PublicProduct => Boolean(item)))
  const [loading, setLoading] = useState(!initialLoadComplete && (!initialStore || !initialProduct))
  const [loadErrorKey, setLoadErrorKey] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isScrolled, setIsScrolled] = useState(false)

  const { addToCart } = useCart()

  const t = (key: string) => {
    return (translations[language] as Record<string, string>)[key] || key
  }

  const label = (key: string, replacements?: Record<string, string | number>) => {
    let value = t(key)
    Object.entries(replacements || {}).forEach(([token, replacement]) => {
      value = value.replace(`{{${token}}}`, String(replacement))
    })
    return value
  }

  useEffect(() => {
    const savedLang = localStorage.getItem('storify_customer_lang')

    if (initialLoadComplete && initialStore?.slug === resolvedParams.slug) {
      setStore(initialStore)
      setProduct(normalizeProduct(initialProduct))
      setAllProducts(asArray(initialProducts).map(normalizeProduct).filter((item): item is PublicProduct => Boolean(item)))
      setLanguage(normalizeLanguage(savedLang || initialStore.defaultLanguage))
      setLoadErrorKey(initialProduct ? null : 'productDetailProductNotFoundDescription')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadErrorKey(null)
    setProduct(null)

    async function fetchData() {
      try {
        const storeRes = await fetch(`/api/v1/public/store/${resolvedParams.slug}`)
        const storeData = storeRes.ok ? await storeRes.json() : null
        const currentStore = storeData?.success ? storeData.data?.store : null

        if (currentStore) {
          setStore(currentStore)
          setAllProducts(asArray<PublicProduct>(storeData.data?.products).map(normalizeProduct).filter((item): item is PublicProduct => Boolean(item)))

          setLanguage(normalizeLanguage(savedLang || currentStore.defaultLanguage))
        }

        const productRes = await fetch(`/api/v1/public/product/${resolvedParams.productId}?storeSlug=${encodeURIComponent(resolvedParams.slug)}`)
        const productData = productRes.ok ? await productRes.json() : null

        if (productData?.success && productData.data) {
          const productStore = productData.data.store
          if (productStore?.slug && productStore.slug !== resolvedParams.slug) {
            setLoadErrorKey('productDetailDoesNotBelong')
            return
          }

          setProduct(normalizeProduct(productData.data))
          if (!currentStore && productStore) {
            setStore(productStore)
            setLanguage(normalizeLanguage(savedLang || productStore.defaultLanguage))
          }
        } else {
          setLoadErrorKey(productRes.status === 404 ? 'productDetailProductNotFoundDescription' : 'productDetailFailedToLoad')
        }
      } catch {
        setLoadErrorKey('productDetailFailedToLoad')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [resolvedParams.slug, resolvedParams.productId, initialStore, initialProduct, initialProducts, initialLoadComplete])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleLanguage = () => {
    setLanguage(prev => {
      if (prev === 'ar') return 'ku'
      if (prev === 'ku') return 'en'
      return 'ar'
    })
  }

  const handleAddToCart = () => {
    if (!product || !store) return

    if (!isCheckoutOpen(store)) {
      toast.error(t('storeClosed'))
      return
    }

    // Check if all options are selected
    const options = product.options || []
    for (const opt of options) {
      if (!selectedOptions[opt.name]) {
        toast.error(label('productDetailSelectOption', { option: opt.name }))
        return
      }
    }

    const matchingVariant = findMatchingVariant(product, selectedOptions)
    if (product.variants?.length > 0) {
      const stock = getVariantStock(matchingVariant)
      const isActive = matchingVariant?.isActive ?? matchingVariant?.is_active ?? false
      if (!matchingVariant || !isActive || stock === null || stock < quantity) {
        toast.error(t('productDetailUnavailable'))
        return
      }
    }

    const variantPrice = matchingVariant?.priceOverride ?? matchingVariant?.price_override ?? null
    const discountPercent = product.discount || store.globalDiscount || 0
    const finalPrice = (variantPrice ?? product.price) * (1 - discountPercent / 100)

    addToCart({
      productId: product.id,
      name: product.title,
      price: finalPrice,
      deliveryFee: product.deliveryFee || 0,
      quantity,
      image: product.media?.[0]?.url || '/placeholder.svg',
      options: selectedOptions
    })

    toast.success(t('productDetailAddedToCart'))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7FAF7]" aria-label={t('productDetailLoading')}>
        <span className="sr-only">{t('productDetailLoading')}</span>
        <div className="w-full max-w-6xl space-y-8 px-4">
          <div className="h-14 rounded-full border border-[#DDE7DE] bg-white" />
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="aspect-square rounded-[28px] bg-[#E4ECE5]" />
            <div className="space-y-5">
              <div className="h-7 w-28 rounded-full bg-[#E4ECE5]" />
              <div className="h-14 w-full rounded-full bg-[#E4ECE5]" />
              <div className="h-8 w-48 rounded-full bg-[#E4ECE5]" />
              <div className="h-24 rounded-[20px] bg-white" />
              <div className="h-14 rounded-full bg-[#E4ECE5]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!store || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7FAF7] p-6">
        <div className="max-w-md space-y-6 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-[#DDE7DE] bg-white shadow-sm">
            <Package className="h-12 w-12 text-[#8B9A90]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-light tracking-normal text-[#0B1412]">
              {t('productDetailProductNotFound')}
            </h1>
            <p className="text-[#66746A]">{t(loadErrorKey || 'productDetailProductNotFoundDescription')}</p>
          </div>
          <Button asChild size="lg" className="h-14 w-full rounded-full bg-[#0B1412] font-semibold text-white shadow-xl hover:bg-[#173E31]">
            <Link href={getStorePath(resolvedParams.slug)}>
              <ChevronLeft className="h-5 w-5 me-2" />
              {t('productDetailBackToStore')}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const direction = language === 'en' ? 'ltr' : 'rtl'
  const isRTL = direction === 'rtl'
  const discountPercent = toNumber(product.discount || store.globalDiscount)
  const hasDiscount = discountPercent > 0
  const productOptions = asArray(product.options)
  const allOptionsSelected = productOptions.every((option) => Boolean(selectedOptions[option.name]))
  const selectedVariant = allOptionsSelected ? findMatchingVariant(product, selectedOptions) : null
  const selectedVariantStock = getVariantStock(selectedVariant)
  const selectedVariantActive = selectedVariant?.isActive ?? selectedVariant?.is_active ?? false
  const selectedVariantUnavailable = asArray(product.variants).length > 0 && allOptionsSelected && (!selectedVariant || !selectedVariantActive || selectedVariantStock === null || selectedVariantStock < quantity)
  const variantPrice = selectedVariant?.priceOverride ?? selectedVariant?.price_override ?? null
  const finalPrice = toNumber(variantPrice ?? product.price) * (1 - discountPercent / 100)
  const currencySymbol = language === 'en' ? 'IQD' : 'د.ع'
  const isStoreCheckoutOpen = isCheckoutOpen(store)
  const purchaseDisabled = selectedVariantUnavailable || !isStoreCheckoutOpen

  return (
    <div className="product-detail-page min-h-screen bg-[#F7FAF7] text-[#0B1412]" dir={direction}>
      <style jsx global>{`
        :root {
          --primary: ${store.themeSettings?.primaryColor || '#008060'};
          --accent: ${store.themeSettings?.accentColor || '#36F4A4'};
        }
        .bg-primary { background-color: var(--primary) !important; }
        .text-primary { color: var(--primary) !important; }
        .border-primary { border-color: var(--primary) !important; }
        .product-detail-page { font-feature-settings: 'ss03' 1; }
        .product-card-shadow {
          box-shadow:
            rgba(11, 20, 18, 0.04) 0 0 0 1px,
            rgba(11, 20, 18, 0.05) 0 2px 6px,
            rgba(11, 20, 18, 0.08) 0 16px 40px,
            rgba(255, 255, 255, 0.75) 0 1px 0 inset;
        }

        .premium-blur {
          backdrop-filter: blur(20px) saturate(180%);
          background-color: rgba(255, 255, 255, 0.8);
        }

        .product-gradient {
          background: radial-gradient(circle at 0% 0%, rgba(0, 128, 96, 0.06) 0%, transparent 50%),
                      radial-gradient(circle at 100% 100%, rgba(54, 244, 164, 0.08) 0%, transparent 50%);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>

      <header className={cn(
        'sticky top-0 z-50 w-full border-b transition-all duration-300',
        isScrolled ? 'premium-blur border-[#DDE7DE] py-2 shadow-sm' : 'border-[#DDE7DE] bg-white/90 py-3 backdrop-blur-xl'
      )}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={getStorePath(store.slug)} className="group flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#DDE7DE] bg-[#EFF5F0] transition-transform group-hover:scale-105">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-medium leading-none tracking-normal text-[#0B1412]">
                {store.name}
              </span>
              <span className="text-xs font-medium text-[#66746A]">{t('productDetailStorefront')}</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="h-11 rounded-full border border-[#DDE7DE] bg-white px-4 text-[#0B1412] shadow-sm hover:bg-[#F0F7F1]"
            >
              <Globe className="h-4 w-4 me-2 text-primary" />
              <span className="text-xs font-semibold tracking-normal">{language.toUpperCase()}</span>
            </Button>
            <CartDrawer storeSlug={store.slug} storeId={store.id} />
          </div>
        </div>
      </header>

      <main className="product-gradient mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">

          <div className="space-y-5 lg:col-span-7">
            <div className="group relative aspect-[4/5] overflow-hidden rounded-[28px] border border-[#DDE7DE] bg-white product-card-shadow sm:aspect-square">
              {product.media && product.media[activeImage] ? (
                product.media[activeImage].type === 'video' ? (
                  <video
                    src={product.media[activeImage].url}
                    className="h-full w-full bg-[#0B1412] object-contain"
                    controls
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={product.media[activeImage].url}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-[#8B9A90]" />
                </div>
              )}

              {hasDiscount && (
                <div className={cn(
                  'absolute top-5 z-10',
                  isRTL ? "right-6" : "left-6"
                )}>
                  <div className="flex items-center gap-2 rounded-full bg-[#0B1412] px-4 py-2 text-sm font-semibold text-white shadow-xl">
                    <Zap className="h-4 w-4 fill-white" />
                    {label('productDetailDiscountOff', { percent: discountPercent })}
                  </div>
                </div>
              )}

              {product.media && product.media.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImage(prev => (prev === 0 ? product.media.length - 1 : prev - 1))}
                    className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#DDE7DE] bg-white/85 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95 group-hover:opacity-100"
                    aria-label={t('productDetailPreviousImage')}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setActiveImage(prev => (prev === product.media.length - 1 ? 0 : prev + 1))}
                    className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#DDE7DE] bg-white/85 opacity-0 shadow-lg backdrop-blur-md transition-all hover:bg-white active:scale-95 group-hover:opacity-100"
                    aria-label={t('productDetailNextImage')}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {product.media && product.media.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {product.media.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'group relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border-2 transition-all duration-300',
                      activeImage === i
                        ? 'scale-105 border-primary shadow-lg'
                        : 'border-[#DDE7DE] opacity-70 hover:border-[#9FB5A3] hover:opacity-100'
                    )}
                  >
                    {img.type === 'video' ? (
                      <div className="h-full w-full relative">
                        <video
                          src={`${img.url}#t=0.1`}
                          className="h-full w-full object-cover"
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40">
                          <Play className="h-8 w-8 text-white fill-white drop-shadow-md" />
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

          <div className="h-fit space-y-8 lg:sticky lg:top-28 lg:col-span-5">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-4 py-1 text-xs font-medium tracking-normal text-primary">
                  {store.name}
                </Badge>
                {product.sku && (
                  <span className="flex items-center gap-2 text-xs font-medium tracking-normal text-[#66746A]">
                    <div className="h-1 w-1 rounded-full bg-[#8B9A90]" />
                    {label('productDetailSku', { sku: product.sku })}
                  </span>
                )}
              </div>

              <h1 className="text-balance text-4xl font-light leading-[1.08] tracking-normal text-[#0B1412] lg:text-5xl">
                {product.title}
              </h1>

              <div className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl font-semibold tracking-normal text-primary">
                    {finalPrice.toLocaleString('en-US')} <span className="text-lg font-medium opacity-70">{currencySymbol}</span>
                  </span>
                  {hasDiscount && (
                    <span className="text-xl text-[#8B9A90] line-through decoration-[#C9D8CB] decoration-2">
                      {toNumber(product.price).toLocaleString('en-US')}
                    </span>
                  )}
                </div>

                {product.needsDeposit && (
                  <div className="flex w-fit items-center gap-3 rounded-[18px] border border-primary/15 bg-primary/5 p-3 shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-normal text-primary/70">{t('needsDeposit')}</p>
                      <p className="text-sm font-semibold">{toNumber(product.depositAmount).toLocaleString('en-US')} {currencySymbol}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[20px] border border-[#DDE7DE] bg-white p-5 text-base leading-7 text-[#66746A] product-card-shadow">
              {product.description}
            </div>

            {productOptions.length > 0 && (
              <div className="space-y-6 rounded-[24px] border border-[#DDE7DE] bg-white p-5 product-card-shadow">
                {productOptions.map((option) => (
                  <div key={option.name} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium tracking-normal text-[#0B1412]">{option.name}</Label>
                      {selectedOptions[option.name] && (
                        <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">{selectedOptions[option.name]}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {asArray(option.values).map((val) => {
                        const swatch = option.swatches?.[val]
                        const isSelected = selectedOptions[option.name] === val
                        const swatchValue = typeof swatch === 'string' ? swatch : ''

                        return (
                          <Button
                            key={val}
                            variant="outline"
                            className={cn(
                              'group relative h-12 rounded-full px-6 transition-all duration-300',
                              isSelected
                                ? 'scale-105 border-primary bg-primary text-white shadow-lg shadow-primary/10'
                                : 'border-[#DDE7DE] bg-white text-[#0B1412] hover:border-[#9FB5A3] hover:bg-[#F0F7F1]',
                              swatch && 'h-12 w-12 rounded-full px-0'
                            )}
                            onClick={() => setSelectedOptions(prev => ({ ...prev, [option.name]: val }))}
                          >
                            {swatchValue ? (
                              <div className="relative h-full w-full flex items-center justify-center">
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-full border border-black/10 shadow-inner transition-transform group-hover:scale-110",
                                    isSelected && "scale-90"
                                  )}
                                  style={{ backgroundColor: swatchValue }}
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Check className={cn(
                                      "h-4 w-4 drop-shadow-md",
                                      (swatchValue.toLowerCase() === '#ffffff' || swatchValue.toLowerCase() === 'white') ? "text-black" : "text-white"
                                    )} />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="font-medium">{val}</span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <Label className="text-sm font-medium tracking-normal text-[#0B1412]">{t('quantity')}</Label>
                <div className="flex items-center rounded-full border border-[#DDE7DE] bg-white p-1 shadow-inner">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-[#F0F7F1] active:scale-95"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center text-lg font-semibold tabular-nums">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-[#F0F7F1] active:scale-95"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={selectedVariantStock !== null && quantity >= selectedVariantStock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedVariantUnavailable && (
                <div className="rounded-[16px] border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                  {t('productDetailUnavailable')}
                </div>
              )}

              {!isStoreCheckoutOpen && (
                <div className="rounded-[16px] border border-destructive/15 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                  {t('storeClosed')}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="xl"
                  className="h-16 flex-[2] rounded-full bg-[#0B1412] text-base font-semibold text-white shadow-2xl shadow-primary/15 transition-all hover:bg-[#173E31] active:scale-[0.98] gap-3"
                  onClick={handleAddToCart}
                  disabled={purchaseDisabled}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {t('addToCart')}
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  className="h-16 flex-1 rounded-full border-[#DDE7DE] bg-white font-semibold text-[#0B1412] transition-all hover:border-[#9FB5A3] hover:bg-[#F0F7F1] active:scale-[0.98]"
                  aria-label={t('productDetailSaveProduct')}
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6">
                <div className="group flex items-center gap-4 rounded-[20px] border border-[#DDE7DE] bg-white p-5 product-card-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:rotate-6">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-normal text-[#66746A]">{t('productDetailShipping')}</p>
                    <p className="text-sm font-semibold text-[#0B1412]">{toNumber(store.deliveryDays, 3)} {t('days')}</p>
                  </div>
                </div>
                <div className="group flex items-center gap-4 rounded-[20px] border border-[#DDE7DE] bg-white p-5 product-card-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF7EF] text-primary transition-transform group-hover:rotate-6">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-normal text-[#66746A]">{t('productDetailPayment')}</p>
                    <p className="text-sm font-semibold text-[#0B1412]">{product.needsDeposit ? t('needsDeposit') : t('productDetailOnDelivery')}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 py-4 text-[#66746A]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-medium tracking-normal">{t('productDetailGuaranteed')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {allProducts.length > 1 && (
          <div className="mt-24 space-y-10">
            <div className="flex items-end justify-between border-b border-[#DDE7DE] pb-6">
              <div className="space-y-2">
                <h2 className="text-3xl font-light tracking-normal text-[#0B1412] sm:text-4xl">
                  {t('productDetailRelatedProducts')}
                </h2>
                <p className="text-sm font-medium tracking-normal text-[#66746A]">{t('productDetailCuratedForYou')}</p>
              </div>
              <Button asChild variant="ghost" className="h-12 rounded-full px-6 font-medium tracking-normal text-primary hover:bg-[#EAF7EF] hover:text-primary">
                <Link href={getStorePath(store.slug, '/products')}>
                  {t('viewAll')} <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {allProducts
                .filter(p => p.id !== product.id)
                .slice(0, 4)
                .map((p) => {
                  const pDiscount = toNumber(p.discount || store.globalDiscount)
                  const pFinalPrice = toNumber(p.price) * (1 - pDiscount / 100)

                  return (
                    <Link key={p.id} href={getStorePath(store.slug, `/product/${p.id}`)} className="group">
                      <Card className="h-full border-0 bg-transparent shadow-none">
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] border border-[#DDE7DE] bg-white product-card-shadow transition-all group-hover:-translate-y-1 group-hover:border-primary/35">
                          {p.media?.[0] ? (
                            p.media[0].type === 'video' ? (
                              <div className="h-full w-full relative">
                                <video
                                  src={`${p.media[0].url}#t=0.1`}
                                  className="h-full w-full object-cover"
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30">
                                  <Play className="h-10 w-10 text-white fill-white drop-shadow-lg" />
                                </div>
                              </div>
                            ) : (
                              <img src={p.media[0].url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            )
                          ) : (
                            <div className="flex h-full w-full items-center justify-center"><Package className="h-12 w-12 text-[#8B9A90]" /></div>
                          )}

                          {pDiscount > 0 && (
                            <div className="absolute left-4 top-4 rounded-full bg-[#0B1412] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                              {label('productDetailDiscountOff', { percent: pDiscount })}
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/50 to-transparent p-5 transition-transform duration-500 group-hover:translate-y-0">
                             <Button className="h-11 w-full rounded-full bg-white text-xs font-semibold text-[#0B1412] hover:bg-[#F7FAF7]">
                               {t('productDetailQuickView')}
                             </Button>
                          </div>
                        </div>
                        <div className="mt-5 space-y-2 px-1">
                          <h3 className="line-clamp-1 text-lg font-medium tracking-normal text-[#0B1412] transition-colors group-hover:text-primary">
                            {p.title}
                          </h3>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold text-primary">{pFinalPrice.toLocaleString('en-US')} {currencySymbol}</p>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF5F0] transition-all group-hover:bg-primary group-hover:text-white">
                              <Plus className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  )
                })}
            </div>
          </div>
        )}
      </main>

      <footer className="relative mt-24 overflow-hidden border-t border-[#DDE7DE] bg-white py-14">
        <div className="absolute top-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/5 blur-[100px]" />
        <div className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 text-center sm:px-6">
          <div className="flex flex-col items-center gap-4">
             <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#DDE7DE] bg-[#EFF5F0]">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-8 w-8 text-primary" />
                )}
             </div>
             <h2 className="text-2xl font-light tracking-normal text-[#0B1412]">{store.name}</h2>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-xs font-medium tracking-normal text-[#8B9A90]">{t('productDetailPoweredBy')}</span>
            <span className="text-xs font-semibold tracking-normal text-primary">Storify SaaS</span>
          </div>
        </div>
      </footer>

      <div className={cn(
        'fixed bottom-0 left-0 right-0 z-50 translate-y-full border-t border-[#DDE7DE] bg-white/95 p-4 backdrop-blur lg:hidden transition-transform duration-500',
        isScrolled && 'translate-y-0'
      )}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-medium tracking-normal text-[#66746A]">{t('total')}</span>
            <span className="text-lg font-semibold text-primary">{finalPrice.toLocaleString('en-US')} {currencySymbol}</span>
          </div>
          <Button
            className="h-14 flex-1 rounded-full bg-[#0B1412] font-semibold text-white shadow-xl shadow-primary/15 hover:bg-[#173E31]"
            onClick={handleAddToCart}
            disabled={purchaseDisabled}
          >
            {t('productDetailBuyNow')}
          </Button>
        </div>
      </div>
    </div>
  )
}
