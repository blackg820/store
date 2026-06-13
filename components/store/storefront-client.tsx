'use client'

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Grid3X3,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Store,
  X,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Send,
  Music2,
  Ghost,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CartDrawer } from '@/components/store/cart-drawer'
import { CustomerNotificationOptIn } from '@/components/store/customer-notification-opt-in'
import { useCart } from '@/lib/cart-context'
import { getStorePath } from '@/lib/store-utils'
import { cn } from '@/lib/utils'
import { translations } from '@/lib/types'

export type StoreLanguage = 'en' | 'ar' | 'ku'
export type StorefrontViewMode = 'profile' | 'products' | 'categories'

export interface PublicStore {
  id: string
  name: string
  slug: string
  currency: string
  whatsappNumber?: string | null
  description?: string | null
  bio?: string | null
  logoUrl?: string | null
  coverUrl?: string | null
  facebookUrl?: string | null
  instagramUrl?: string | null
  tiktokUrl?: string | null
  youtubeUrl?: string | null
  twitterUrl?: string | null
  telegramUrl?: string | null
  snapchatUrl?: string | null
  websiteUrl?: string | null
  defaultLanguage?: string | null
  deliveryDays?: number | null
  status?: string | null
  isOpen?: boolean | null
  checkoutEnabled?: boolean | null
  themeSettings?: {
    primaryColor?: string
    accentColor?: string
    backgroundColor?: string
    foreground?: string
    card?: string
    fontFamily?: string
  } | null
}

interface ProductMedia {
  id: string
  url: string
  type: string
  isMain?: boolean
}

interface PublicProductOption {
  id?: string
  name: string
  values: string[]
  type?: string
  swatches?: Record<string, string>
}

interface PublicProductVariant {
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
  title: string
  description: string
  price: number
  discount: number
  categoryId?: string | null
  categorySlug?: string | null
  productTypeId?: string | null
  productTypeSlug?: string | null
  category: string | null
  productType: string | null
  media: ProductMedia[]
  options: PublicProductOption[]
  variants: PublicProductVariant[]
  deliveryFee?: number
  needsDeposit?: boolean
  depositAmount?: number
  customData?: Record<string, unknown>
  rating?: number
  ratingCount?: number
  createdAt?: string
  isActive?: boolean
}

export interface PublicCategory {
  id: string
  name: string
  slug: string
  productsCount?: number
}

export interface PublicProductType {
  id: string
  name: string
  slug: string
}

interface ReviewsSummary {
  averageRating: number
  reviewCount: number
}

interface CategoryTile {
  id: string
  key: string
  name: string
  slug: string
  count: number
}

export interface StorefrontSections {
  featuredProducts?: PublicProduct[]
  bestSellers?: PublicProduct[]
  trendingProducts?: PublicProduct[]
  categoriesWithCounts?: PublicCategory[]
  lowStockProducts?: PublicProduct[]
  reviewsSummary?: ReviewsSummary
}

export interface StorefrontClientProps {
  store: PublicStore
  products: PublicProduct[]
  categories?: PublicCategory[]
  productTypes?: PublicProductType[]
  sections?: StorefrontSections
  siteName: string
  saasContactWhatsapp?: string | null
  initialLanguage?: StoreLanguage
  initialView?: StorefrontViewMode
  initialCategoryId?: string | null
}

type StorefrontLabels = {
  addToCart: string
  all: string
  backToProfile: string
  bestSellers: string
  browseByCategory: string
  buyNow: string
  categories: string
  categoriesCount: string
  categoryDirectory: string
  clearFilters: string
  contactWhatsapp: string
  coverAlt: string
  featuredProducts: string
  inStock: string
  items: string
  logoAlt: string
  noCategories: string
  noProducts: string
  noProductsFound: string
  noProductsInCategory: string
  outOfStock: string
  price: string
  products: string
  productsCount: string
  quantity: string
  recentProducts: string
  searchProducts: string
  selectedCategory: string
  showAllCategories: string
  showAllProducts: string
  lowStock: string
  newArrivals: string
  storeClosed: string
  storeOpen: string
  uncategorized: string
  viewDetails: string
  viewProducts: string
}

const HOME_CATEGORY_LIMIT = 8
const HOME_PRODUCT_LIMIT = 8
const CARD_SURFACE = 'border border-[#DDE7DE] bg-white storefront-card-shadow'
const TILE_SURFACE = 'border border-[#DDE7DE] bg-white storefront-card-shadow'
const PRIMARY_BUTTON = 'rounded-full bg-[#0B1412] text-white hover:bg-[#173E31] active:scale-[0.98]'
const SECONDARY_BUTTON = 'rounded-full border-[#C9D8CB] bg-white text-[#0B1412] hover:border-[#9FB5A3] hover:bg-[#F0F7F1]'

function normalizeLanguage(language?: string | null): StoreLanguage {
  return language === 'en' || language === 'ar' || language === 'ku' ? language : 'ar'
}

function normalizeFilterValue(value?: string | null) {
  return (value || '').trim().toLowerCase()
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getProductFilterKeys(product: PublicProduct) {
  return new Set([
    product.categoryId ? `category:${product.categoryId}` : '',
    product.categorySlug ? `category-slug:${normalizeFilterValue(product.categorySlug)}` : '',
    product.category ? `name:${normalizeFilterValue(product.category)}` : '',
    product.productTypeId ? `type:${product.productTypeId}` : '',
    product.productTypeSlug ? `type-slug:${normalizeFilterValue(product.productTypeSlug)}` : '',
    product.productType ? `name:${normalizeFilterValue(product.productType)}` : '',
  ].filter(Boolean))
}

function getMediaUrl(url: string | undefined | null, width: number) {
  if (!url) return ''
  if (!url.includes('bunny')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}width=${width}`
}

function getProductImage(product: PublicProduct) {
  const media = product.media?.find((item) => item.type === 'image' && item.isMain)
    || product.media?.find((item) => item.type === 'image')
    || product.media?.[0]
  return media?.url || ''
}

function getFinalPrice(product: PublicProduct, override?: number | null) {
  const basePrice = override ?? product.price
  return Math.max(0, Number(basePrice || 0) * (1 - Number(product.discount || 0) / 100))
}

function getProductStock(product: PublicProduct) {
  if (!product.variants?.length) return null

  const stocks = product.variants
    .filter((variant) => variant.isActive ?? variant.is_active ?? true)
    .map((variant) => Number(variant.stockQuantity ?? variant.stock_quantity ?? 0))

  if (stocks.length === 0) return null
  if (stocks.every((stock) => stock <= 0)) return 0

  return Math.min(...stocks.filter((stock) => stock > 0))
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
  return product.variants?.find((variant) => {
    const optionValues = parseOptionValues(variant.optionValues ?? variant.option_values)
    return Object.entries(selectedOptions).every(([key, value]) => optionValues[key] === value)
  })
}

function uniqueProducts(products: PublicProduct[]) {
  const seen = new Set<string>()
  return products.filter((product) => {
    if (seen.has(product.id)) return false
    seen.add(product.id)
    return true
  })
}

function SocialLink({ href, icon: Icon, label }: { href: string; icon: any; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE7DE] bg-white text-[#66746A] transition hover:border-[var(--store-primary)] hover:bg-[#F0F7F1] hover:text-[var(--store-primary)]"
      aria-label={label}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </a>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value))
}

function ProductCard({
  labels,
  language,
  onQuickAdd,
  product,
  store,
}: {
  labels: StorefrontLabels
  language: StoreLanguage
  onQuickAdd: (event: MouseEvent<HTMLButtonElement>, product: PublicProduct) => void
  product: PublicProduct
  store: PublicStore
}) {
  const finalPrice = getFinalPrice(product)
  const hasDiscount = Number(product.discount || 0) > 0
  const imageUrl = getProductImage(product)
  const stock = getProductStock(product)
  const isOutOfStock = stock === 0
  const isLowStock = stock !== null && stock > 0 && stock <= 5
  const categoryName = product.category || product.productType || labels.uncategorized

  return (
    <article className={cn('group flex h-full flex-col overflow-hidden rounded-[20px] transition duration-200 hover:-translate-y-0.5 hover:border-[#008060]/45', CARD_SURFACE)}>
      <Link href={getStorePath(store.slug, `/product/${product.id}`)} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#EFF5F0]">
          {imageUrl ? (
            product.media?.[0]?.type === 'video' ? (
              <video
                src={`${getMediaUrl(imageUrl, 720)}#t=0.1`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={getMediaUrl(imageUrl, 720)}
                alt={product.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#F3F7F3]">
              <Package className="h-10 w-10 text-[#8B9A90]" aria-hidden="true" />
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {hasDiscount ? (
              <Badge className="rounded-full border-0 bg-[#36F4A4] px-2.5 py-1 text-[11px] font-semibold text-black">
                -{formatNumber(product.discount)}%
              </Badge>
            ) : null}
            {isOutOfStock ? (
              <Badge className="rounded-full border border-[#0B1412]/10 bg-[#0B1412] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                {labels.outOfStock}
              </Badge>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
        <div className="min-h-20">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-medium text-[#66746A]">{categoryName}</p>
            {stock !== null ? (
              <span className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                isOutOfStock
                  ? 'border-[#DDE7DE] bg-[#F4F7F4] text-[#66746A]'
                  : isLowStock
                    ? 'border-[#008060]/25 bg-[#EAF7EF] text-[#008060]'
                    : 'border-[#DDE7DE] bg-[#F4F7F4] text-[#0B1412]'
              )}>
                {isOutOfStock ? labels.outOfStock : isLowStock ? labels.lowStock : labels.inStock}
              </span>
            ) : null}
          </div>
          <Link href={getStorePath(store.slug, `/product/${product.id}`)}>
            <h3 className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-[#0B1412] transition group-hover:text-[var(--store-primary)]">
              {product.title}
            </h3>
          </Link>
        </div>

        <div className="mt-auto space-y-3">
          <div className="min-w-0">
            {hasDiscount ? (
              <p className="text-xs font-medium text-[#8B9A90] line-through">
                {formatNumber(product.price)} {store.currency}
              </p>
            ) : null}
            <p className="text-lg font-semibold tabular-nums text-[#0B1412]">
              {formatNumber(finalPrice)}
              <span className="ms-1 text-xs font-semibold text-[#66746A]">{store.currency}</span>
            </p>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button
              className={cn('h-11 min-w-0 px-3 text-xs font-semibold transition disabled:border-[#DDE7DE] disabled:bg-[#EFF5F0] disabled:text-[#8B9A90] sm:text-sm', PRIMARY_BUTTON)}
              disabled={isOutOfStock}
              onClick={(event) => onQuickAdd(event, product)}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{isOutOfStock ? labels.outOfStock : labels.addToCart}</span>
            </Button>
            <Button asChild variant="outline" size="icon-sm" className={cn('h-11 w-11', SECONDARY_BUTTON)}>
              <Link href={getStorePath(store.slug, `/product/${product.id}`)} aria-label={labels.viewDetails}>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function ProductRail({
  labels,
  language,
  onQuickAdd,
  products,
  store,
  title,
}: {
  labels: StorefrontLabels
  language: StoreLanguage
  onQuickAdd: (event: MouseEvent<HTMLButtonElement>, product: PublicProduct) => void
  products: PublicProduct[]
  store: PublicStore
  title: string
}) {
  if (products.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium tracking-normal text-[#0B1412] sm:text-xl">{title}</h2>
        <Button asChild variant="ghost" className="rounded-full text-[var(--store-primary)] hover:bg-[#EAF7EF] hover:text-[var(--store-primary)]">
          <Link href={getStorePath(store.slug, '/products')}>
            {labels.showAllProducts}
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            labels={labels}
            language={language}
            onQuickAdd={onQuickAdd}
            product={product}
            store={store}
          />
        ))}
      </div>
    </section>
  )
}

export function StorefrontClient({
  store,
  products,
  categories: apiCategories = [],
  productTypes: apiProductTypes = [],
  sections,
  siteName,
  saasContactWhatsapp,
  initialLanguage = 'ar',
  initialView = 'profile',
  initialCategoryId,
}: StorefrontClientProps) {
  const [language, setLanguage] = useState<StoreLanguage>(normalizeLanguage(initialLanguage))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<StorefrontViewMode>(initialView)
  const [quickViewProduct, setQuickViewProduct] = useState<PublicProduct | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [quickViewQty, setQuickViewQty] = useState(1)
  const deferredSearch = useDeferredValue(searchQuery)
  const { addToCart, totalItems, totalPrice } = useCart()

  useEffect(() => {
    const savedLang = localStorage.getItem('storify_customer_lang')
    const normalized = normalizeLanguage(savedLang)
    if (savedLang && normalized !== language) setLanguage(normalized)
  }, [language])

  const appTranslations = translations[language] as Record<string, string>
  const t = (key: string) => appTranslations[key] || key
  const label = (key: string, replacements?: Record<string, string | number>) => {
    let value = t(key)
    Object.entries(replacements || {}).forEach(([token, replacement]) => {
      value = value.replace(`{{${token}}}`, String(replacement))
    })
    return value
  }

  const labels: StorefrontLabels = {
    addToCart: t('addToCart'),
    all: t('storefrontAll'),
    backToProfile: t('storefrontBackToProfile'),
    bestSellers: t('storefrontBestSellers'),
    browseByCategory: t('storefrontBrowseByCategory'),
    buyNow: t('storefrontBuyNow'),
    categories: t('storefrontCategories'),
    categoriesCount: t('storefrontCategoriesCount'),
    categoryDirectory: t('storefrontCategoryDirectory'),
    clearFilters: t('storefrontClearFilters'),
    contactWhatsapp: t('storefrontContactWhatsapp'),
    coverAlt: label('storefrontCoverAlt', { store: store.name }),
    featuredProducts: t('storefrontFeaturedProducts'),
    inStock: t('storefrontInStock'),
    items: t('items'),
    logoAlt: label('storefrontLogoAlt', { store: store.name }),
    noCategories: t('storefrontNoCategories'),
    noProducts: t('storefrontNoProductsText'),
    noProductsFound: t('storefrontNoProductsFound'),
    noProductsInCategory: t('storefrontNoProductsInCategory'),
    outOfStock: t('storefrontOutOfStock'),
    price: t('price'),
    products: t('storefrontProducts'),
    productsCount: t('storefrontProductsCount'),
    quantity: t('quantity'),
    recentProducts: t('storefrontRecentProducts'),
    searchProducts: t('storefrontSearchProducts'),
    selectedCategory: t('storefrontSelectedCategory'),
    showAllCategories: t('storefrontShowAllCategories'),
    showAllProducts: t('storefrontShowAllProducts'),
    lowStock: t('storefrontLowStock'),
    newArrivals: t('storefrontNewArrivals'),
    storeClosed: t('storefrontStoreClosed'),
    storeOpen: t('storefrontStoreOpen'),
    uncategorized: t('storefrontUncategorized'),
    viewDetails: t('viewDetails'),
    viewProducts: t('storefrontViewProducts'),
  }

  const direction = language === 'en' ? 'ltr' : 'rtl'
  const isRTL = direction === 'rtl'
  const isStoreOpen = store.isOpen ?? (store.status ? store.status === 'active' : true)
  const profileHref = getStorePath(store.slug)
  const productsHref = getStorePath(store.slug, '/products')
  const categoriesHref = getStorePath(store.slug, '/categories')
  const getCategoryHref = (category: CategoryTile) => getStorePath(store.slug, `/category/${encodeURIComponent(category.id)}`)

  const themeVars: CSSProperties & Record<'--store-primary' | '--store-accent' | '--store-bg', string> = {
    '--store-primary': store.themeSettings?.primaryColor || '#008060',
    '--store-accent': store.themeSettings?.accentColor || '#36F4A4',
    '--store-bg': '#F7FAF7',
    color: '#0B1412',
  }

  const handleSetLanguage = (lang: StoreLanguage) => {
    setLanguage(lang)
    localStorage.setItem('storify_customer_lang', lang)
  }

  const activeProducts = useMemo(
    () => uniqueProducts((products || []).filter((product) => product.isActive !== false)),
    [products]
  )

  const productById = useMemo(
    () => new Map(activeProducts.map((product) => [product.id, product])),
    [activeProducts]
  )

  const normalizeSectionProducts = (sectionProducts?: PublicProduct[]) => {
    if (!sectionProducts?.length) return []
    return sectionProducts
      .map((product) => productById.get(product.id) || product)
      .filter((product) => product.isActive !== false)
  }

  const recentProducts = useMemo(() => {
    return [...activeProducts]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, HOME_PRODUCT_LIMIT)
  }, [activeProducts])

  const featuredProducts = useMemo(() => {
    const apiFeatured = normalizeSectionProducts(sections?.featuredProducts)
    if (apiFeatured.length > 0) return uniqueProducts(apiFeatured).slice(0, HOME_PRODUCT_LIMIT)

    return uniqueProducts([
      ...activeProducts.filter((product) => (product.discount || 0) > 0),
      ...activeProducts.filter((product) => Boolean(product.customData?.featured)),
      ...recentProducts,
    ]).slice(0, HOME_PRODUCT_LIMIT)
  }, [activeProducts, productById, recentProducts, sections?.featuredProducts])

  const bestSellerProducts = useMemo(() => {
    const apiBestSellers = normalizeSectionProducts(sections?.bestSellers)
    return uniqueProducts(apiBestSellers).slice(0, 4)
  }, [productById, sections?.bestSellers])

  const newArrivalProducts = useMemo(() => {
    const featuredIds = new Set(featuredProducts.map((product) => product.id))
    return recentProducts.filter((product) => !featuredIds.has(product.id)).slice(0, 4)
  }, [featuredProducts, recentProducts])

  const profileProducts = featuredProducts.length > 0 ? featuredProducts : recentProducts

  const categoryTiles = useMemo<CategoryTile[]>(() => {
    const fallbackCounts = new Map<string, number>()
    const keyCounts = new Map<string, number>()

    activeProducts.forEach((product) => {
      const fallbackName = product.category || product.productType || labels.uncategorized
      fallbackCounts.set(fallbackName, (fallbackCounts.get(fallbackName) || 0) + 1)
      getProductFilterKeys(product).forEach((key) => {
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1)
      })
    })

    const productTypeTiles = apiProductTypes.map((productType) => ({
      id: productType.id,
      key: `type:${productType.id}`,
      name: productType.name,
      slug: productType.slug,
      productsCount:
        keyCounts.get(`type:${productType.id}`)
        || keyCounts.get(`type-slug:${normalizeFilterValue(productType.slug)}`)
        || fallbackCounts.get(productType.name)
        || 0,
    }))

    const apiTiles = sections?.categoriesWithCounts?.length
      ? sections.categoriesWithCounts
      : (apiCategories.length > 0 ? apiCategories : productTypeTiles)

    const tiles = apiTiles
      .map((category) => ({
        id: category.id,
        key: `category:${category.id}`,
        name: category.name,
        slug: category.slug,
        count:
          category.productsCount
          ?? keyCounts.get(`category:${category.id}`)
          ?? keyCounts.get(`category-slug:${normalizeFilterValue(category.slug)}`)
          ?? fallbackCounts.get(category.name)
          ?? 0,
      }))
      .filter((category) => category.count > 0)

    if (tiles.length > 0) return tiles

    return Array.from(fallbackCounts.entries()).map(([name, count]) => ({
      id: name,
      key: `name:${normalizeFilterValue(name)}`,
      name,
      slug: normalizeFilterValue(name).replace(/\s+/g, '-'),
      count,
    }))
  }, [activeProducts, apiCategories, apiProductTypes, labels.uncategorized, sections?.categoriesWithCounts])

  const selectedCategoryTile = useMemo(
    () => categoryTiles.find((category) => category.key === selectedCategory),
    [categoryTiles, selectedCategory]
  )

  useEffect(() => {
    setViewMode(initialView)
    if (!initialCategoryId) {
      setSelectedCategory('all')
      setSearchQuery('')
    }
  }, [initialCategoryId, initialView])

  useEffect(() => {
    if (!initialCategoryId || categoryTiles.length === 0) return

    const decodedCategoryId = safeDecode(initialCategoryId)
    const routeCategory = categoryTiles.find((category) =>
      category.id === decodedCategoryId
      || category.key === decodedCategoryId
      || category.slug === decodedCategoryId
    )

    if (routeCategory) {
      setSelectedCategory(routeCategory.key)
      setViewMode('products')
      setSearchQuery('')
    }
  }, [categoryTiles, initialCategoryId])

  const filteredProducts = useMemo(() => {
    const queryTerms = deferredSearch.toLowerCase().trim().split(/\s+/).filter(Boolean)

    return activeProducts.filter((product) => {
      const categoryName = product.category || product.productType || labels.uncategorized
      const matchesCategory = selectedCategory === 'all' || getProductFilterKeys(product).has(selectedCategory)
      const matchesSearch = queryTerms.every((term) =>
        product.title.toLowerCase().includes(term)
        || product.description.toLowerCase().includes(term)
        || categoryName.toLowerCase().includes(term)
      )

      return matchesCategory && matchesSearch
    })
  }, [activeProducts, deferredSearch, labels.uncategorized, selectedCategory])

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setViewMode('products')
  }

  const openQuickView = (product: PublicProduct) => {
    const defaultOptions: Record<string, string> = {}
    product.options?.forEach((option) => {
      if (option.values?.[0]) defaultOptions[option.name] = option.values[0]
    })

    setSelectedOptions(defaultOptions)
    setQuickViewQty(1)
    setQuickViewProduct(product)
  }

  const addProductToCart = (product: PublicProduct, quantity = 1, options: Record<string, string> = {}) => {
    const variant = findMatchingVariant(product, options)
    const override = variant?.priceOverride ?? variant?.price_override ?? null
    const finalPrice = getFinalPrice(product, override)

    addToCart({
      productId: product.id,
      name: product.title,
      price: finalPrice,
      deliveryFee: product.deliveryFee || 0,
      quantity,
      options: Object.keys(options).length > 0 ? options : undefined,
      image: getProductImage(product) || '/placeholder.svg',
    })

    toast.success(labels.addToCart)
  }

  const handleQuickAdd = (event: MouseEvent<HTMLButtonElement>, product: PublicProduct) => {
    event.preventDefault()
    event.stopPropagation()

    if (product.options?.length > 0) {
      openQuickView(product)
      return
    }

    addProductToCart(product)
  }

  const handleQuickViewAdd = () => {
    if (!quickViewProduct) return
    addProductToCart(quickViewProduct, quickViewQty, selectedOptions)
    setQuickViewProduct(null)
  }

  return (
    <div className="storefront-light min-h-screen bg-[var(--store-bg)] text-[#0B1412]" dir={direction} style={themeVars}>
      <style jsx global>{`
        body { background-color: var(--store-bg); }
        html { scroll-behavior: smooth; }
        .storefront-light { font-feature-settings: 'ss03' 1; }
        .storefront-card-shadow {
          box-shadow:
            rgba(11, 20, 18, 0.04) 0 0 0 1px,
            rgba(11, 20, 18, 0.05) 0 2px 6px,
            rgba(11, 20, 18, 0.08) 0 16px 40px,
            rgba(255, 255, 255, 0.75) 0 1px 0 inset;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-[#DDE7DE] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href={profileHref}
            className="flex min-w-0 items-center gap-3 text-start"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EFF5F0] ring-1 ring-[#DDE7DE]">
              {store.logoUrl ? (
                <img src={getMediaUrl(store.logoUrl, 160)} alt={labels.logoAlt} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 text-[var(--store-primary)]" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#0B1412] sm:text-base">{store.name}</p>
              <p className={cn('text-xs font-medium', isStoreOpen ? 'text-[#008060]' : 'text-[#66746A]')}>
                {isStoreOpen ? labels.storeOpen : labels.storeClosed}
              </p>
            </div>
          </Link>

          <nav className="ms-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full text-[#66746A] hover:bg-[#EFF5F0] hover:text-[#0B1412] sm:inline-flex">
              <Link href={productsHref}>{labels.products}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full text-[#66746A] hover:bg-[#EFF5F0] hover:text-[#0B1412] sm:inline-flex">
              <Link href={categoriesHref}>{labels.categories}</Link>
            </Button>
            <div className="hidden rounded-full border border-[#DDE7DE] bg-[#F3F7F3] p-1 sm:flex">
              {(['ar', 'ku', 'en'] as StoreLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleSetLanguage(lang)}
                  className={cn(
                    'rounded-full px-2.5 py-1.5 text-xs font-semibold transition',
                    language === lang ? 'bg-white text-[#0B1412] shadow-sm' : 'text-[#66746A] hover:text-[#0B1412]'
                  )}
                  aria-label={lang.toUpperCase()}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            <CartDrawer storeSlug={store.slug} storeId={store.id} storeData={{ name: store.name, whatsappNumber: store.whatsappNumber }} />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <section className={cn('overflow-hidden rounded-[28px]', CARD_SURFACE)}>
          <div className="relative h-52 bg-[#EFF5F0] sm:h-72">
            {store.coverUrl ? (
              <img
                src={getMediaUrl(store.coverUrl, 1800)}
                alt={labels.coverAlt}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(54,244,164,0.32),transparent_30%),radial-gradient(circle_at_82%_28%,rgba(0,128,96,0.16),transparent_35%),linear-gradient(135deg,#F7FAF7,#EAF7EF_50%,#F2F7F1)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/10" />
          </div>

          <div className="relative px-5 pb-8 pt-16 text-center sm:px-8 sm:pb-10 sm:pt-20">
            <div className="absolute left-1/2 top-0 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 shadow-[0_22px_50px_rgba(11,20,18,0.16)] ring-2 ring-white sm:h-32 sm:w-32">
              {store.logoUrl ? (
                <img src={getMediaUrl(store.logoUrl, 320)} alt={labels.logoAlt} className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#EFF5F0]">
                  <Store className="h-10 w-10 text-[var(--store-primary)]" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="mx-auto max-w-3xl">
              <div className="flex flex-col items-center gap-3">
                <h1 className="text-balance text-3xl font-light tracking-normal text-[#0B1412] sm:text-5xl">{store.name}</h1>
                <Badge
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-semibold',
                    isStoreOpen
                      ? 'border-[#008060]/25 bg-[#EAF7EF] text-[#008060]'
                      : 'border-[#DDE7DE] bg-[#F4F7F4] text-[#66746A]'
                  )}
                >
                  <CheckCircle2 className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  {isStoreOpen ? labels.storeOpen : labels.storeClosed}
                </Badge>
              </div>

              {store.description ? (
                <p className="mx-auto mt-4 max-w-[65ch] text-sm leading-6 text-[#66746A] sm:text-base">{store.description}</p>
              ) : null}

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {store.facebookUrl && <SocialLink href={store.facebookUrl} icon={Facebook} label="Facebook" />}
                {store.instagramUrl && <SocialLink href={store.instagramUrl} icon={Instagram} label="Instagram" />}
                {store.tiktokUrl && <SocialLink href={store.tiktokUrl} icon={Music2} label="TikTok" />}
                {store.twitterUrl && <SocialLink href={store.twitterUrl} icon={Twitter} label="X / Twitter" />}
                {store.youtubeUrl && <SocialLink href={store.youtubeUrl} icon={Youtube} label="YouTube" />}
                {store.telegramUrl && <SocialLink href={store.telegramUrl} icon={Send} label="Telegram" />}
                {store.snapchatUrl && <SocialLink href={store.snapchatUrl} icon={Ghost} label="Snapchat" />}
                {store.websiteUrl && <SocialLink href={store.websiteUrl} icon={Globe} label="Website" />}
              </div>

              <div className="mx-auto mt-6 grid max-w-md grid-cols-2 overflow-hidden rounded-[18px] border border-[#DDE7DE] bg-[#F3F7F3]">
                <div className="border-e border-[#DDE7DE] p-4">
                  <p className="text-xl font-semibold tabular-nums text-[#0B1412]">{formatNumber(activeProducts.length)}</p>
                  <p className="text-xs font-medium text-[#66746A]">{labels.products}</p>
                </div>
                <div className="p-4">
                  <p className="text-xl font-semibold tabular-nums text-[#0B1412]">{formatNumber(categoryTiles.length)}</p>
                  <p className="text-xs font-medium text-[#66746A]">{labels.categories}</p>
                </div>
              </div>

              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                {store.whatsappNumber ? (
                  <Button asChild variant="outline" className={cn('h-12', SECONDARY_BUTTON)}>
                    <a href={`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="me-2 h-4 w-4 text-[#008060]" aria-hidden="true" />
                      {labels.contactWhatsapp}
                    </a>
                  </Button>
                ) : null}
                <Button asChild className={cn('h-12 px-6 font-semibold', PRIMARY_BUTTON)}>
                  <Link href={productsHref}>
                    {labels.viewProducts}
                    {isRTL ? <ArrowLeft className="ms-2 h-4 w-4" aria-hidden="true" /> : <ArrowRight className="ms-2 h-4 w-4" aria-hidden="true" />}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {viewMode === 'profile' ? (
          <div className="space-y-10 py-10">
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-medium tracking-normal text-[#0B1412]">{labels.categories}</h2>
                  <p className="mt-1 text-sm text-[#66746A]">{labels.browseByCategory}</p>
                </div>
                {categoryTiles.length > HOME_CATEGORY_LIMIT ? (
                  <Button asChild variant="ghost" className="rounded-full text-[var(--store-primary)] hover:bg-[#EAF7EF] hover:text-[var(--store-primary)]">
                    <Link href={categoriesHref}>{labels.showAllCategories}</Link>
                  </Button>
                ) : null}
              </div>

              {categoryTiles.length > 0 ? (
                <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
                  <Link
                    href={productsHref}
                    className={cn('flex min-w-32 flex-col justify-between rounded-[18px] p-4 text-start transition hover:-translate-y-0.5 hover:border-[#008060]/45', TILE_SURFACE)}
                  >
                    <Grid3X3 className="h-5 w-5 text-[var(--store-primary)]" aria-hidden="true" />
                    <span className="mt-5 text-sm font-medium text-[#0B1412]">{labels.all}</span>
                    <span className="mt-1 text-xs text-[#66746A]">{formatNumber(activeProducts.length)} {labels.items}</span>
                  </Link>
                  {categoryTiles.slice(0, HOME_CATEGORY_LIMIT).map((category) => (
                    <Link
                      key={category.key}
                      href={getCategoryHref(category)}
                      className={cn('flex min-w-40 flex-col justify-between rounded-[18px] p-4 text-start transition hover:-translate-y-0.5 hover:border-[#008060]/45', TILE_SURFACE)}
                    >
                      <Grid3X3 className="h-5 w-5 text-[var(--store-primary)]" aria-hidden="true" />
                      <span className="mt-5 line-clamp-2 text-sm font-medium text-[#0B1412]">{category.name}</span>
                      <span className="mt-1 text-xs text-[#66746A]">{formatNumber(category.count)} {labels.items}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#C9D8CB] bg-white p-8 text-center text-sm text-[#66746A]">
                  {labels.noCategories}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-medium tracking-normal text-[#0B1412]">
                    {featuredProducts.length > 0 ? labels.featuredProducts : labels.recentProducts}
                  </h2>
                  <p className="mt-1 text-sm text-[#66746A]">{labels.productsCount.replace('{{count}}', formatNumber(activeProducts.length))}</p>
                </div>
                {activeProducts.length > HOME_PRODUCT_LIMIT ? (
                  <Button asChild variant="ghost" className="rounded-full text-[var(--store-primary)] hover:bg-[#EAF7EF] hover:text-[var(--store-primary)]">
                    <Link href={productsHref}>{labels.showAllProducts}</Link>
                  </Button>
                ) : null}
              </div>

              {profileProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {profileProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      labels={labels}
                      language={language}
                      onQuickAdd={handleQuickAdd}
                      product={product}
                      store={store}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#C9D8CB] bg-white p-10 text-center">
                  <Package className="mx-auto h-10 w-10 text-[#8B9A90]" aria-hidden="true" />
                  <p className="mt-4 text-sm font-medium text-[#66746A]">{labels.noProducts}</p>
                </div>
              )}
            </section>

            <ProductRail
              labels={labels}
              language={language}
              onQuickAdd={handleQuickAdd}
              products={bestSellerProducts}
              store={store}
              title={labels.bestSellers}
            />

            <ProductRail
              labels={labels}
              language={language}
              onQuickAdd={handleQuickAdd}
              products={newArrivalProducts}
              store={store}
              title={labels.newArrivals}
            />
          </div>
        ) : null}

        {viewMode === 'categories' ? (
          <section className="space-y-5 py-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--store-primary)]">{labels.categories}</p>
                <h2 className="text-2xl font-light tracking-normal text-[#0B1412] sm:text-3xl">{labels.categoryDirectory}</h2>
                <p className="mt-1 text-sm text-[#66746A]">{labels.categoriesCount.replace('{{count}}', formatNumber(categoryTiles.length))}</p>
              </div>
              <Button asChild variant="outline" className={SECONDARY_BUTTON}>
                <Link href={profileHref}>{labels.backToProfile}</Link>
              </Button>
            </div>

            {categoryTiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <Link
                  href={productsHref}
                  className={cn('min-h-32 rounded-[18px] p-5 text-start transition hover:-translate-y-0.5 hover:border-[#008060]/45', TILE_SURFACE)}
                >
                  <Grid3X3 className="h-5 w-5 text-[var(--store-primary)]" aria-hidden="true" />
                  <p className="mt-5 font-medium text-[#0B1412]">{labels.all}</p>
                  <p className="mt-1 text-sm text-[#66746A]">{formatNumber(activeProducts.length)} {labels.items}</p>
                </Link>
                {categoryTiles.map((category) => (
                  <Link
                    key={category.key}
                    href={getCategoryHref(category)}
                    className={cn('min-h-32 rounded-[18px] p-5 text-start transition hover:-translate-y-0.5 hover:border-[#008060]/45', TILE_SURFACE)}
                  >
                    <Grid3X3 className="h-5 w-5 text-[var(--store-primary)]" aria-hidden="true" />
                    <p className="mt-5 line-clamp-2 font-medium text-[#0B1412]">{category.name}</p>
                    <p className="mt-1 text-sm text-[#66746A]">{formatNumber(category.count)} {labels.items}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#C9D8CB] bg-white p-10 text-center text-sm text-[#66746A]">
                {labels.noCategories}
              </div>
            )}
          </section>
        ) : null}

        {viewMode === 'products' ? (
          <section className="space-y-5 py-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--store-primary)]">{labels.products}</p>
                <h2 className="text-2xl font-light tracking-normal text-[#0B1412] sm:text-3xl">
                  {selectedCategoryTile ? selectedCategoryTile.name : labels.showAllProducts}
                </h2>
                <p className="mt-1 text-sm text-[#66746A]">
                  {selectedCategoryTile
                    ? labels.selectedCategory.replace('{{category}}', selectedCategoryTile.name)
                    : labels.productsCount.replace('{{count}}', formatNumber(filteredProducts.length))}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline" className={SECONDARY_BUTTON}>
                  <Link href={profileHref}>{labels.backToProfile}</Link>
                </Button>
                <Button variant="ghost" className="rounded-full text-[var(--store-primary)] hover:bg-[#EAF7EF] hover:text-[var(--store-primary)]" onClick={resetFilters}>
                  <X className="me-2 h-4 w-4" aria-hidden="true" />
                  {labels.clearFilters}
                </Button>
              </div>
            </div>

            <div className={cn('space-y-3 rounded-[20px] p-3', CARD_SURFACE)}>
              <div className="relative">
                <Search className={cn('absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B9A90]', isRTL ? 'right-3' : 'left-3')} aria-hidden="true" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={labels.searchProducts}
                  className={cn('h-12 rounded-full border-[#DDE7DE] bg-[#F7FAF7] text-[#0B1412] placeholder:text-[#8B9A90] focus-visible:ring-[#36F4A4]', isRTL ? 'pr-10' : 'pl-10')}
                />
              </div>

              <div className="no-scrollbar flex gap-2 overflow-x-auto">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  className={cn('shrink-0 rounded-full', selectedCategory === 'all' ? PRIMARY_BUTTON : SECONDARY_BUTTON)}
                  onClick={() => setSelectedCategory('all')}
                >
                  {labels.all}
                </Button>
                {categoryTiles.map((category) => (
                  <Button
                    key={category.key}
                    variant={selectedCategory === category.key ? 'default' : 'outline'}
                    className={cn('shrink-0 rounded-full', selectedCategory === category.key ? PRIMARY_BUTTON : SECONDARY_BUTTON)}
                    onClick={() => setSelectedCategory(category.key)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    labels={labels}
                    language={language}
                    onQuickAdd={handleQuickAdd}
                    product={product}
                    store={store}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[#C9D8CB] bg-white p-10 text-center">
                <Search className="mx-auto h-10 w-10 text-[#8B9A90]" aria-hidden="true" />
                <p className="mt-4 text-base font-medium text-[#0B1412]">
                  {selectedCategory === 'all' ? labels.noProductsFound : labels.noProductsInCategory}
                </p>
                <Button className={cn('mt-5', PRIMARY_BUTTON)} onClick={resetFilters}>
                  {labels.clearFilters}
                </Button>
              </div>
            )}
          </section>
        ) : null}
      </main>

      <Dialog open={Boolean(quickViewProduct)} onOpenChange={(open) => !open && setQuickViewProduct(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[24px] border-[#DDE7DE] bg-white p-0 text-[#0B1412] sm:max-w-3xl">
          {quickViewProduct ? (
            <div className="grid md:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-[#EFF5F0]">
                <div className="aspect-[4/5]">
                  {quickViewProduct.media?.[0]?.type === 'video' ? (
                    <video src={quickViewProduct.media[0].url} className="h-full w-full object-cover" controls muted playsInline />
                  ) : (
                    <img
                      src={getMediaUrl(getProductImage(quickViewProduct), 720) || '/placeholder.svg'}
                      alt={quickViewProduct.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-6 p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-light tracking-normal text-[#0B1412]">{quickViewProduct.title}</DialogTitle>
                  <DialogDescription className="line-clamp-3 text-sm leading-6 text-[#66746A]">
                    {quickViewProduct.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                  {quickViewProduct.options?.map((option) => (
                    <div key={option.name} className="space-y-3">
                      <Label className="text-sm font-medium text-[#0B1412]">{option.name}</Label>
                      <RadioGroup
                        value={selectedOptions[option.name]}
                        onValueChange={(value) => setSelectedOptions((current) => ({ ...current, [option.name]: value }))}
                        className="flex flex-wrap gap-2"
                      >
                        {option.values?.map((value) => (
                          <div key={value}>
                            <RadioGroupItem value={value} id={`${option.name}-${value}`} className="peer sr-only" />
                            <Label
                              htmlFor={`${option.name}-${value}`}
                              className="flex cursor-pointer items-center justify-center rounded-full border border-[#DDE7DE] bg-white px-4 py-2 text-sm font-semibold text-[#0B1412] transition hover:bg-[#F0F7F1] peer-data-[state=checked]:border-[var(--store-primary)] peer-data-[state=checked]:bg-[var(--store-primary)] peer-data-[state=checked]:text-white"
                            >
                              {value}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-[#0B1412]">{labels.quantity}</Label>
                    <div className="flex w-fit items-center rounded-full border border-[#DDE7DE] bg-[#F3F7F3]">
                      <Button variant="ghost" size="icon" className="rounded-full text-[#0B1412] hover:bg-white" onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}>
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <span className="w-10 text-center font-semibold text-[#0B1412]">{quickViewQty}</span>
                      <Button variant="ghost" size="icon" className="rounded-full text-[#0B1412] hover:bg-white" onClick={() => setQuickViewQty(quickViewQty + 1)}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-[#DDE7DE] pt-5">
                  <div>
                    <p className="text-xs font-semibold text-[#66746A]">{labels.price}</p>
                    <p className="text-2xl font-semibold text-[#0B1412]">
                      {formatNumber(getFinalPrice(quickViewProduct) * quickViewQty)}
                      <span className="ms-1 text-sm text-[#66746A]">{store.currency}</span>
                    </p>
                  </div>
                  <Button className={cn('h-12 flex-1 font-semibold', PRIMARY_BUTTON)} onClick={handleQuickViewAdd}>
                    <ShoppingCart className="me-2 h-4 w-4" aria-hidden="true" />
                    {labels.addToCart}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <CustomerNotificationOptIn storeId={store.id} storeName={store.name} language={language} />

      <footer className="border-t border-[#DDE7DE] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#EFF5F0] ring-1 ring-[#DDE7DE]">
              {store.logoUrl ? (
                <img src={getMediaUrl(store.logoUrl, 160)} alt={labels.logoAlt} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5 text-[var(--store-primary)]" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-[#0B1412]">{store.name}</p>
              <p className="text-xs text-[#66746A]">{siteName}</p>
            </div>
          </div>
          {saasContactWhatsapp ? (
            <Button asChild variant="outline" className={cn('w-fit', SECONDARY_BUTTON)}>
              <a href={`https://wa.me/${saasContactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Store className="me-2 h-4 w-4" aria-hidden="true" />
                {siteName}
              </a>
            </Button>
          ) : null}
        </div>
      </footer>

      {totalItems > 0 ? (
        <div className="fixed inset-x-3 bottom-3 z-50 rounded-[20px] border border-[#DDE7DE] bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#66746A]">{totalItems} {labels.items}</p>
              <p className="font-semibold text-[#0B1412]">{formatNumber(totalPrice)} {store.currency}</p>
            </div>
            <CartDrawer storeSlug={store.slug} storeId={store.id} storeData={{ name: store.name, whatsappNumber: store.whatsappNumber }} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
