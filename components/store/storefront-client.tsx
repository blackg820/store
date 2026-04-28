'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Store, Package, Search, Globe, ShoppingCart, 
  Loader2, Truck, ChevronRight, LayoutGrid, 
  Heart, Share2, Info, Star, User, MessageCircle, Play, Video
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCart } from '@/lib/cart-context'
import { CartDrawer } from '@/components/store/cart-drawer'
import { toast } from 'sonner'
import { getStorePath } from '@/lib/store-utils'
import { cn } from '@/lib/utils'
import { translations } from '@/lib/types'

interface PublicStore {
  id: string
  name: string
  nameAr: string
  slug: string
  currency: string
  whatsappNumber?: string | null
  description?: string
  descriptionAr?: string
  logoUrl?: string | null
  coverUrl?: string | null
  defaultLanguage?: string
  deliveryDays?: number
  themeSettings?: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    foreground?: string
    card?: string
    fontFamily: string
  }
}

interface PublicProduct {
  id: string
  title: string
  titleAr: string
  description: string
  descriptionAr?: string
  price: number
  discount: number
  category: string | null
  productType: string | null
  media: { id: string, url: string, type: string }[]
  options: any[]
  variants: any[]
  customData?: any
  rating?: number
  ratingCount?: number
}

interface StorefrontClientProps {
  store: PublicStore
  products: PublicProduct[]
  siteName: string
  initialLanguage?: 'en' | 'ar' | 'ku'
}

export function StorefrontClient({ store, products, siteName, initialLanguage = 'ar' }: StorefrontClientProps) {
  const [language, setLanguage] = useState<'en' | 'ar' | 'ku'>(initialLanguage)
  const [searchQuery, setSearchQuery] = useState('')
  const { addToCart } = useCart()

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('storify_customer_lang') as 'en' | 'ar' | 'ku' | null
    if (savedLang && (savedLang === 'en' || savedLang === 'ar' || savedLang === 'ku')) {
      setLanguage(savedLang)
    }
  }, [])

  // Save language and update document direction
  const handleSetLanguage = (lang: 'en' | 'ar' | 'ku') => {
    setLanguage(lang)
    localStorage.setItem('storify_customer_lang', lang)
  }

  const t = (key: string) => {
    return (translations[language] as any)[key] || (translations.en as any)[key] || key
  }

  const direction = language === 'en' ? 'ltr' : 'rtl'
  const isRTL = direction === 'rtl'

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.titleAr && p.titleAr.includes(searchQuery))
  )

  const groupedProducts: Record<string, PublicProduct[]> = {}
  filteredProducts.forEach(product => {
    const type = product.productType || (language === 'ar' ? 'عام' : language === 'ku' ? 'گشتی' : 'General')
    if (!groupedProducts[type]) groupedProducts[type] = []
    groupedProducts[type].push(product)
  })

  const handleQuickAdd = (e: React.MouseEvent, product: PublicProduct) => {
    e.preventDefault()
    e.stopPropagation()
    
    const options = product.customData?.options || []
    if (options.length > 0) {
      window.location.href = getStorePath(store.slug, `/product/${product.id}`)
      return
    }

    const discountPercent = product.discount || 0
    const finalPrice = product.price * (1 - discountPercent / 100)

    addToCart({
      productId: product.id,
      name: product.title,
      nameAr: product.titleAr,
      price: finalPrice,
      deliveryFee: (product as any).deliveryFee || 0,
      quantity: 1,
      image: product.media[0]?.url || '/placeholder.svg'
    })
    toast.success(t('addToCart'))
  }

  return (
    <div className="min-h-screen font-outfit selection:bg-primary/20" dir={direction} style={{ 
      color: store.themeSettings?.foreground || '#0f172a'
    } as any}>
      <style jsx global>{`
        :root {
          --primary: ${store.themeSettings?.primaryColor || '#2563eb'};
          --accent: ${store.themeSettings?.accentColor || '#3b82f6'};
          --background: ${store.themeSettings?.backgroundColor || '#ffffff'};
          --foreground: ${store.themeSettings?.foreground || '#0f172a'};
          --card: ${store.themeSettings?.card || '#ffffff'};
        }
        
        body { background-color: var(--background); }
        .font-outfit { font-family: 'Outfit', 'Cairo', sans-serif; }
        .bg-primary { background-color: var(--primary) !important; }
        .text-primary { color: var(--primary) !important; }
        .border-primary { border-color: var(--primary) !important; }
        
        .premium-card {
          background-color: var(--card);
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 2rem;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 20px -4px rgba(0,0,0,0.05);
        }
        
        .premium-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px -12px rgba(0,0,0,0.12);
          border-color: var(--primary);
        }

        .glass-header {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .glass-profile-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }

        .hero-gradient {
          background: radial-gradient(circle at 0% 0%, var(--primary)08 0%, transparent 50%),
                      radial-gradient(circle at 100% 100%, var(--accent)08 0%, transparent 50%);
        }

        @media (max-width: 640px) {
          .product-card-title { font-size: 1rem; }
          .product-card-price { font-size: 1.25rem; }
          .product-card-desc { font-size: 0.85rem; }
          .premium-card { border-radius: 1.75rem; }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass-header">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <Link href={getStorePath(store.slug)} className="flex items-center gap-4 group">
            <div className="h-11 w-11 rounded-2xl bg-primary flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
              {store.logoUrl ? (
                <img 
                  src={store.logoUrl.includes('bunny') ? `${store.logoUrl}?width=100` : store.logoUrl} 
                  alt={store.name} 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <Store className="h-6 w-6 text-primary-foreground" />
              )}
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:inline-block">
              {language === 'en' ? store.name : store.nameAr}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-black/5 h-12 w-12">
                  <Globe className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="rounded-2xl p-2 min-w-[140px] glass-card border-black/5">
                <DropdownMenuItem 
                  onClick={() => handleSetLanguage('ar')}
                  className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'ar' && "bg-primary/10 text-primary")}
                >
                  العربية
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleSetLanguage('ku')}
                  className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'ku' && "bg-primary/10 text-primary")}
                >
                  کوردی
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleSetLanguage('en')}
                  className={cn("rounded-xl cursor-pointer px-4 py-3 font-bold", language === 'en' && "bg-primary/10 text-primary")}
                >
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <CartDrawer storeSlug={store.slug} storeId={store.id} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Compact Premium Hero Section */}
        <div className="relative mb-12 rounded-[2.5rem] overflow-hidden bg-muted/20 flex items-center hero-gradient border border-black/[0.03]">
          {/* Decorative Blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[100%] rounded-full bg-primary/5 blur-[100px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[100%] rounded-full bg-accent/5 blur-[100px] animate-pulse delay-1000" />
          </div>

          {store.coverUrl && (
            <div className="absolute inset-0 z-0">
              <img 
                src={store.coverUrl.includes('bunny') ? `${store.coverUrl}?width=1600` : store.coverUrl} 
                alt={store.name} 
                className="w-full h-full object-cover opacity-[0.1]" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
            </div>
          )}
          
          <div className="relative z-10 w-full px-8 sm:px-12 py-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            {/* Logo area - smaller and more integrated */}
            <div className="relative shrink-0 perspective-1000">
              <div className="h-40 w-40 sm:h-48 sm:w-48 rounded-[2rem] glass-profile-card p-6 shadow-xl shadow-primary/5 flex items-center justify-center overflow-hidden transition-transform hover:scale-105 duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                {store.logoUrl ? (
                  <img 
                    src={store.logoUrl.includes('bunny') ? `${store.logoUrl}?width=300` : store.logoUrl} 
                    alt={store.name} 
                    className="h-full w-full object-contain relative z-10 filter drop-shadow-lg" 
                  />
                ) : (
                  <Store className="h-16 w-16 text-primary/10 relative z-10" />
                )}
              </div>
            </div>

            <div className="flex-1 text-center lg:text-start space-y-5">
              <div className={cn("flex flex-wrap items-center gap-3 justify-center lg:justify-start")}>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  {t('officialStore')}
                  <Star className="ml-1.5 h-3 w-3 fill-primary" />
                </Badge>
                <div className="flex items-center gap-2 bg-white/40 backdrop-blur-sm border border-black/5 px-3 py-1 rounded-xl">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-green-700">{t('availableNow')}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-tight text-balance">
                  {language === 'en' ? store.name : store.nameAr}
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground/80 max-w-xl font-medium leading-relaxed line-clamp-2 text-pretty">
                  {language === 'en' ? store.description : store.descriptionAr}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start pt-2">
                <div className="relative w-full max-w-sm group">
                  <Search className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground/60 h-4 w-4 transition-colors group-focus-within:text-primary", isRTL ? "right-4" : "left-4")} />
                  <input
                    type="text"
                    placeholder={t('searchplaceholder')}
                    className={cn("w-full h-12 rounded-2xl border-none bg-white shadow-xl shadow-primary/5 focus:ring-4 ring-primary/10 pl-11 pr-11 text-base font-medium outline-none transition-all", isRTL ? "pr-11" : "pl-11")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4 px-5 py-3 bg-white/30 backdrop-blur-md rounded-2xl border border-white/50 text-xs font-bold shrink-0">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>{store.deliveryDays} {t('days')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories / Product Groups */}
        <div className="space-y-24">
          {Object.entries(groupedProducts).map(([type, groupProducts]) => (
            <section key={type} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-2 rounded-full bg-primary" />
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tighter">{type}</h2>
                  </div>
                  <p className="text-muted-foreground font-medium ps-6">
                    {groupProducts.length} {t('items')} {t('available' as any) || 'available'}
                  </p>
                </div>
                <Button variant="ghost" className="text-primary gap-3 group/btn h-14 px-8 rounded-2xl hover:bg-primary/5 font-bold text-lg">
                  {t('viewAll')}
                  <ChevronRight className={cn("h-5 w-5 group-hover/btn:translate-x-2 transition-transform", isRTL && "rotate-180 group-hover/btn:-translate-x-2")} />
                </Button>
              </div>

              {groupProducts.length === 0 ? (
                <div className="text-center py-24 bg-muted/10 rounded-[3rem] border-2 border-dashed border-black/5">
                  <Package className="h-16 w-16 text-muted-foreground/20 mx-auto mb-6" />
                  <p className="text-xl text-muted-foreground font-bold">{t('noMatchesFound')}</p>
                  <p className="text-muted-foreground/60">{t('adjustSearch')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
                  {groupProducts.map((product) => {
                    const discountPercent = product.discount || 0
                    const finalPrice = product.price * (1 - discountPercent / 100)
                    const hasDiscount = discountPercent > 0

                    return (
                      <Link key={product.id} href={getStorePath(store.slug, `/product/${product.id}`)} className="block group/card">
                        <Card className="premium-card h-full flex flex-col border-none shadow-none bg-transparent rounded-none">
                          <div className="relative aspect-[3/4] overflow-hidden rounded-[2.5rem] bg-muted mb-8 group-hover:shadow-2xl group-hover:shadow-primary/10 transition-shadow duration-500">
                            {product.media[0] ? (
                              product.media[0].type === 'video' ? (
                                <div className="w-full h-full relative group/video">
                                  <video 
                                    src={`${product.media[0].url}#t=0.1`} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    muted
                                    playsInline
                                    loop
                                    preload="metadata"
                                    onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                    onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none group-hover:bg-transparent transition-colors duration-500">
                                    <div className="h-16 w-16 rounded-full bg-white/30 backdrop-blur-xl flex items-center justify-center border border-white/40 shadow-2xl">
                                      <Play className="h-8 w-8 text-white fill-white" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={product.media[0].url.includes('bunny') ? `${product.media[0].url}?width=800` : product.media[0].url}
                                  alt={product.title}
                                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                <Package className="h-16 w-16" />
                              </div>
                            )}
                            
                            {hasDiscount && (
                              <Badge className="absolute top-6 left-6 bg-red-500 text-white border-none px-4 py-2 rounded-2xl text-xs sm:text-sm font-black shadow-xl animate-bounce">
                                -{discountPercent}%
                              </Badge>
                            )}

                            <div className="absolute inset-x-4 bottom-4 p-4 translate-y-[120%] group-hover/card:translate-y-0 transition-transform duration-500 ease-out z-20">
                              <Button 
                                className="w-full h-14 rounded-2xl bg-white/95 hover:bg-white text-black border-none shadow-2xl backdrop-blur-xl font-bold text-base"
                                onClick={(e) => handleQuickAdd(e, product)}
                              >
                                <ShoppingCart className={cn("h-5 w-5", isRTL ? "ml-2" : "mr-2")} />
                                {t('addToCart')}
                              </Button>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                          </div>

                          <CardContent className="p-0 flex-1 flex flex-col px-2">
                            <div className="flex-1 space-y-3 mb-8">
                              <h3 className="font-black text-xl sm:text-2xl line-clamp-1 group-hover/card:text-primary transition-colors tracking-tight product-card-title">
                                {language === 'en' ? product.title : (language === 'ar' ? product.titleAr : product.titleAr)}
                              </h3>
                              <p className="text-muted-foreground/70 text-sm sm:text-base line-clamp-2 leading-relaxed font-medium product-card-desc">
                                {language === 'en' ? product.description : (language === 'ar' ? product.descriptionAr : product.descriptionAr)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between mt-auto bg-muted/5 p-4 rounded-3xl border border-black/[0.03]">
                              <div className="flex flex-col">
                                {hasDiscount && (
                                  <span className="text-xs sm:text-sm text-muted-foreground line-through opacity-40 font-bold mb-0.5">
                                    {product.price.toLocaleString()} {store.currency}
                                  </span>
                                )}
                                <span className="text-xl sm:text-3xl font-black tracking-tighter product-card-price">
                                  {finalPrice.toLocaleString()} <span className="text-sm sm:text-lg font-bold text-primary opacity-80 ms-1">{store.currency}</span>
                                </span>
                              </div>
                              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center group-hover/card:bg-primary group-hover/card:text-white transition-all duration-500 shadow-sm border border-primary/10">
                                <ChevronRight className={cn("h-6 w-6 transition-transform group-hover/card:scale-110", isRTL && "rotate-180")} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-40 py-20 border-t border-black/[0.05] bg-muted/10">
        <div className="container mx-auto px-6 text-center space-y-10">
          <div className="flex flex-col items-center gap-6">
            <div className="h-16 w-16 rounded-[2rem] bg-primary/10 flex items-center justify-center shadow-inner">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <span className="font-black text-3xl tracking-tighter">{language === 'en' ? store.name : store.nameAr}</span>
              <p className="text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed">
                {t('thankYouNote')}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 pt-10 border-t border-black/5 text-sm font-bold text-muted-foreground/60">
             <span>© {new Date().getFullYear()} {siteName}</span>
             <div className="h-1.5 w-1.5 rounded-full bg-black/10" />
             <span>{t('poweredBy')}</span>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {store.whatsappNumber && (
        <a
          href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "fixed bottom-10 z-50 flex items-center gap-4 px-8 py-5 rounded-[2rem] bg-[#25D366] text-white shadow-2xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 active:scale-95 group",
            isRTL ? "left-10" : "right-10"
          )}
        >
          <MessageCircle className="h-7 w-7 fill-current animate-bounce" />
          <span className="font-black text-lg tracking-tight uppercase">
            {t('contactStore')}
          </span>
        </a>
      )}
    </div>
  )
}
