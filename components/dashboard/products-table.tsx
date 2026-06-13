'use client'

import { useEffect, useMemo, useState } from 'react'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import { Product, ProductOption, ProductVariant } from '@/lib/types'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Search,
  ImageIcon,
  Plus,
  Star,
  MoreHorizontal,
  Edit,
  Save,
  CheckCircle2,
  Package,
  Layers,
  Globe,
  Trash2,
  X,
  Languages,
  Eye,
  FileDown,
  Upload,
  Link2,
  Filter,
  ArrowUpDown,
  MoreVertical,
  PlusCircle,
  Copy,
  LayoutGrid,
  List,
  DollarSign,
  Settings,
  Play,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
  Send,
  FolderTree,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getStoreUrl } from '@/lib/store-utils'
import { Media } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { TelegramPreviewModal } from './telegram-preview-modal'



interface ProductsTableProps {
  storeId?: string
  userId?: string
}

export function ProductsTable({ storeId, userId }: ProductsTableProps) {
  const { language, user } = useAuth()
  const { t } = useTranslations()
  const isAr = language === 'ar' || language === 'ku'
  const isEmployee = user?.role === 'employee'
  const {
    products, stores, getStoresByUserId,
    addProduct, updateProduct, deleteProduct,
    updateStore,
    isDataLoading, selectedStoreId,
    getProductTypesByStoreId, categories
  } = useData()

  const [searchQuery, setSearchQuery] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false)

  // Form state
  const [formData, setFormData] = useState<{
    storeId: string
    sku: string
    title: string
    description: string
    price: number
    costPrice: number
    discount: number
    deliveryFee: number
    needsDeposit: boolean
    depositAmount: number
    isActive: boolean
    options: ProductOption[]
    variants: ProductVariant[]
    media: Array<{ id: string; url: string; type: 'image' | 'video'; isMain?: boolean }>
    productTypeId: string
    categoryId: string
    customData: any
  }>({
    storeId: storeId || selectedStoreId || '',
    sku: '',
    title: '',
    description: '',
    price: 0,
    costPrice: 0,
    discount: 0,
    deliveryFee: 0,
    needsDeposit: false,
    depositAmount: 0,
    isActive: true,
    options: [],
    variants: [],
    media: [],
    productTypeId: '',
    categoryId: '',
    customData: {}
  })

  const [showTranslations, setShowTranslations] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [manualMediaUrl, setManualMediaUrl] = useState('')

  const isRtl = language === 'ar' || language === 'ku'

  // Get role-scoped stores. Employees receive owner-scoped stores from the API.
  const userStores = useMemo(() => {
    if (userId) return getStoresByUserId(userId)
    return user?.role === 'admin' ? stores : getStoresByUserId(user?.id || '')
  }, [getStoresByUserId, stores, user?.id, user?.role, userId])

  const allowedStoreIds = useMemo(() => new Set(userStores.map((store) => store.id)), [userStores])
  const defaultStoreId = useMemo(() => {
    if (storeId) return storeId
    if (selectedStoreId && allowedStoreIds.has(selectedStoreId)) return selectedStoreId
    if (userStores.length === 1 || user?.role !== 'admin') return userStores[0]?.id || ''
    return ''
  }, [allowedStoreIds, selectedStoreId, storeId, user?.role, userStores])

  useEffect(() => {
    if (formData.storeId || !defaultStoreId) return
    setFormData(prev => ({ ...prev, storeId: defaultStoreId }))
  }, [defaultStoreId, formData.storeId])

  // Filter products by global selection
  let filteredProducts = selectedStoreId
    ? products.filter(p => p.storeId === selectedStoreId)
    : products

  if (userId || user?.role !== 'admin') {
    filteredProducts = filteredProducts.filter(p => allowedStoreIds.has(p.storeId))
  }

  if (searchQuery) {
    filteredProducts = filteredProducts.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const resetForm = () => {
    setFormData({
      storeId: defaultStoreId,
      sku: "",
      title: "",
      description: "",
      price: 0,
      costPrice: 0,
      discount: 0,
      deliveryFee: 0,
      needsDeposit: false,
      depositAmount: 0,
      isActive: true,
      options: [],
      variants: [],
      media: [],
      productTypeId: "",
      categoryId: "",
      customData: {}
    })
  }

  const handleAdd = async () => {
    if (!formData.storeId) return

    try {
      await addProduct({
        storeId: formData.storeId,
        sku: formData.sku || undefined,
        title: formData.title,
        description: formData.description,
        price: formData.price,
        costPrice: formData.costPrice,
        discount: formData.discount > 0 ? formData.discount : undefined,
        deliveryFee: formData.deliveryFee,
        needsDeposit: formData.needsDeposit,
        depositAmount: formData.depositAmount,
        isActive: formData.isActive,
        options: formData.options,
        variants: formData.variants,
        media: formData.media,
        productTypeId: formData.productTypeId,
        categoryId: formData.categoryId || undefined,
        customData: formData.customData || {}
      })
      setIsAddDialogOpen(false)
      resetForm()
    } catch (e) {
      // toast already handles error in context
    }
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      storeId: product.storeId,
      sku: product.sku || '',
      title: product.title,
      description: product.description || '',
      price: product.price,
      costPrice: product.costPrice || 0,
      discount: product.discount || 0,
      deliveryFee: product.deliveryFee || 0,
      needsDeposit: product.needsDeposit || false,
      depositAmount: product.depositAmount || 0,
      isActive: product.isActive,
      options: product.options || [],
      variants: product.variants || [],
      media: product.media || [],
      productTypeId: product.productTypeId || '',
      categoryId: product.categoryId || '',
      customData: product.customData || {}
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (selectedProduct) {
      try {
        await updateProduct(selectedProduct.id, {
          storeId: formData.storeId,
          sku: formData.sku || undefined,
          title: formData.title,
          description: formData.description,
          price: formData.price,
          costPrice: formData.costPrice,
          discount: formData.discount,
          deliveryFee: formData.deliveryFee,
          needsDeposit: formData.needsDeposit,
          depositAmount: formData.depositAmount,
          isActive: formData.isActive,
          options: formData.options,
          variants: formData.variants,
          media: formData.media,
          productTypeId: formData.productTypeId,
          categoryId: formData.categoryId || undefined,
          customData: formData.customData
        })
        setIsEditDialogOpen(false)
        setSelectedProduct(null)
      } catch (e) {
        // toast handles error
      }
    }
  }

  const handleDelete = (productId: string) => {
    if (confirm(t('areYouSure'))) {
      deleteProduct(productId)
    }
  }

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { id: crypto.randomUUID(), name: '', values: [], type: 'choice' }]
    }))
  }

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const updateOptionName = (index: number, name: string) => {
    setFormData(prev => {
      const newOptions = [...prev.options]
      newOptions[index].name = name
      return { ...prev, options: newOptions }
    })
  }

  const addOptionValue = (index: number, value: string) => {
    if (!value.trim()) return
    setFormData(prev => {
      const newOptions = [...prev.options]
      if (!newOptions[index].values.includes(value.trim())) {
        newOptions[index].values = [...newOptions[index].values, value.trim()]
      }
      return { ...prev, options: newOptions }
    })
  }

  const removeOptionValue = (index: number, valueIndex: number) => {
    setFormData(prev => {
      const newOptions = [...prev.options]
      newOptions[index].values = newOptions[index].values.filter((_, i) => i !== valueIndex)
      return { ...prev, options: newOptions }
    })
  }

  const updateOptionType = (index: number, type: 'choice' | 'text' | 'multi-choice' | 'color') => {
    setFormData(prev => {
      const newOptions = [...prev.options]
      newOptions[index].type = type
      if (type === 'text') newOptions[index].values = []
      return { ...prev, options: newOptions }
    })
  }

  const applyOptionPreset = (index: number, preset: 'size' | 'color' | 'material') => {
    const store = stores.find(s => s.id === formData.storeId)
    const storePresets = store?.optionPresets || {}

    const defaultPresets: any = {
      size: { name: 'Size', values: ['S', 'M', 'L', 'XL', 'XXL'] },
      color: {
        name: 'Color',
        type: 'color',
        values: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple'],
        swatches: {
          'Black': '#000000', 'White': '#FFFFFF', 'Red': '#FF0000',
          'Blue': '#0000FF', 'Green': '#008000', 'Yellow': '#FFFF00', 'Purple': '#800080'
        }
      },
      material: { name: 'Material', values: ['Cotton', 'Silk', 'Polyester', 'Leather'] }
    }

    const data = storePresets[preset] || defaultPresets[preset]
    if (!data) return

    setFormData(prev => {
      const newOptions = [...prev.options]
      newOptions[index] = {
        ...newOptions[index],
        ...data,
        id: newOptions[index].id || crypto.randomUUID(),
        type: data.type || 'choice'
      }
      return { ...prev, options: newOptions }
    })
  }

  const saveOptionAsPreset = async (index: number) => {
    const option = formData.options[index]
    if (!option.name || option.values.length === 0) {
      toast.error(t('fillOptionFirst' as any) || 'Please name the option and add values first')
      return
    }

    const store = stores.find(s => s.id === formData.storeId)
    if (!store) return

    const newPresets = {
      ...(store.optionPresets || {}),
      [option.name.toLowerCase().replace(/\s+/g, '_')]: {
        name: option.name,
        values: option.values,
        swatches: option.swatches,
        type: option.type
      }
    }

    try {
      await updateStore(store.id, { optionPresets: newPresets })
      toast.success(t('presetSaved' as any) || 'Option saved as preset!')
    } catch (err) {
      console.error('Failed to save preset:', err)
    }
  }

  const generateVariants = () => {
    const options = formData.options.filter(o => o.name && o.values.length > 0)
    if (options.length === 0) {
      toast.error(t('addOptionsFirst'))
      return
    }

    // Helper for cartesian product
    const cartesian = (...a: any[]) => a.reduce((a, b) => a.flatMap((d: any) => b.map((e: any) => [d, e].flat())))

    const combinations = options.length > 1
      ? cartesian(...options.map(o => o.values))
      : options[0].values.map(v => [v])

    const newVariants: ProductVariant[] = combinations.map((combo: string[]) => {
      const optionValues: Record<string, string> = {}
      options.forEach((opt, i) => {
        optionValues[opt.name] = combo[i]
      })

      return {
        id: crypto.randomUUID(),
        optionValues,
        priceOverride: formData.price,
        stockQuantity: 100,
        sku: `${formData.sku || 'SKU'}-${combo.join('-')}`.toUpperCase()
      }
    })

    setFormData(prev => ({ ...prev, variants: newVariants }))
    toast.success(`${newVariants.length} ${t('variantsGenerated')}`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !formData.storeId) {
      if (!formData.storeId) toast.error(t('selectStoreFirst' as any))
      e.target.value = ''
      return
    }

    setIsUploading(true)
    const toastId = toast.loading(t('uploadingMedia' as any))

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('storeId', formData.storeId)
      if (selectedProduct) {
        uploadFormData.append('productId', selectedProduct.id)
      }

      const res = await fetch('/api/v1/media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        },
        body: uploadFormData
      })

      const result = await res.json().catch(() => null)
      if (result?.success && result.data) {
        setFormData(prev => ({
          ...prev,
          media: [...prev.media, result.data]
        }))
        toast.success(t('mediaUploaded' as any), { id: toastId })
      } else {
        const validationMessage = result?.errors
          ? Object.values(result.errors).flat().find((message): message is string => typeof message === 'string')
          : undefined
        toast.error(validationMessage || result?.message || result?.error || t('mediaUploadFailed' as any), { id: toastId })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(t('connectionError' as any), { id: toastId })
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const setMainMedia = (id: string) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.map(m => ({ ...m, isMain: m.id === id }))
    }))
  }

  const removeMedia = (id: string) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter(m => m.id !== id)
    }))
  }

  const addManualMedia = () => {
    if (!manualMediaUrl) return
    setFormData(prev => ({
      ...prev,
      media: [...prev.media, { id: `manual-${Date.now()}`, url: manualMediaUrl, type: 'image' as const }]
    }))
    setManualMediaUrl('')
  }

  const ProductFormFields = () => (
    <div className="max-h-[75vh] overflow-y-auto px-1 custom-scrollbar">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-12 bg-muted/30 p-1 rounded-xl mb-6">
          <TabsTrigger value="general" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t('general')}</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('media')}</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('pricing')}</span>
          </TabsTrigger>
          <TabsTrigger value="options" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">{t('options')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!storeId && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1 flex items-center gap-2">
                  <Globe className="h-3 w-3" /> {t('selectStore')}
                </Label>
                <Select
                  value={formData.storeId}
                  onValueChange={(val) => setFormData({ ...formData, storeId: val, productTypeId: '', categoryId: '' })}
                >
                  <SelectTrigger className="rounded-xl bg-muted/20 border-white/10 h-11 focus:ring-primary/20">
                    <SelectValue placeholder={t('selectStore')} />
                  </SelectTrigger>
                  <SelectContent>
                    {userStores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1 flex items-center gap-2">
                <Settings className="h-3 w-3" /> {t('productType')}
              </Label>
              <Select
                value={formData.productTypeId}
                onValueChange={(val) => setFormData({ ...formData, productTypeId: val, categoryId: '' })}
              >
                <SelectTrigger className="rounded-xl bg-muted/20 border-white/10 h-11 focus:ring-primary/20">
                  <SelectValue placeholder={t('selectProductType')} />
                </SelectTrigger>
                <SelectContent>
                  {getProductTypesByStoreId(formData.storeId)
                    .map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          {(!type.storeId || type.storeId === 'null') && <Globe className="h-3 w-3 text-primary" />}
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {formData.productTypeId && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1 flex items-center gap-2">
                  <FolderTree className="h-3 w-3" /> {isRtl ? 'الفئة الفرعية' : 'Sub-Category'}
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                >
                  <SelectTrigger className="rounded-xl bg-muted/20 border-white/10 h-11 focus:ring-primary/20">
                    <SelectValue placeholder={isRtl ? 'اختر فئة فرعية (اختياري)' : 'Select sub-category (optional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{isRtl ? 'بدون فئة فرعية' : 'No sub-category'}</SelectItem>
                    {categories
                      .filter(c => c.productTypeId === formData.productTypeId)
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1 flex items-center gap-2">
              <Package className="h-3 w-3" /> SKU / {t('productCodeSku' as any)}
            </Label>
            <Input
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="PROD-123"
              className="rounded-xl bg-muted/20 border-white/10 h-11 focus:ring-primary/20"
            />
          </div>

            <div className="space-y-4">
              <div className="space-y-3 p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-inner">
                <div className="flex items-center gap-2 text-primary">
                  <Globe className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('productDetails')}</span>
                </div>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('titlePlaceholder' as any)}
                  className="bg-background border-white/10 rounded-xl h-11 font-bold focus:ring-primary/20"
                />
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('descriptionPlaceholder' as any)}
                  rows={3}
                  className="bg-background border-white/10 rounded-2xl resize-none focus:ring-primary/20"
                />
              </div>
            </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                {t('productMedia' as any)}
              </Label>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                {formData.media.length} / 10
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {formData.media.map((m, i) => (
                <div key={m.id} className="relative aspect-square rounded-2xl border border-white/10 overflow-hidden group bg-muted/30 shadow-inner">
                  {m.type === 'video' ? (
                    <div className="w-full h-full relative group">
                      <video
                        src={`${m.url}#t=0.1`}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                        <Play className="h-10 w-10 text-white fill-white drop-shadow-lg" />
                      </div>
                    </div>
                  ) : (
                    <img src={m.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-2">
                    <Button
                      type="button"
                      variant={m.isMain ? "default" : "secondary"}
                      size="icon"
                      onClick={() => setMainMedia(m.id)}
                      className={cn(
                        "h-7 w-7 rounded-full shadow-lg",
                        m.isMain ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-white/20 hover:bg-white/40 text-white"
                      )}
                    >
                      <Star className={cn("h-4 w-4", m.isMain && "fill-current")} />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeMedia(m.id)}
                      className="h-7 w-7 rounded-full shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {m.isMain && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-yellow-500 text-[8px] font-black uppercase text-white shadow-lg">
                      Main
                    </div>
                  )}
                </div>
              ))}

              {formData.media.length < 10 && (
                <label className={cn(
                  "relative aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all group",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    disabled={isUploading || !formData.storeId}
                  />
                  {isUploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center mb-2 group-hover:bg-primary/10 transition-colors">
                        <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground group-hover:text-primary">
                        {t('addMedia')}
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-muted/20 border border-white/5 space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('addViaUrl' as any)}</Label>
              <div className="flex gap-2">
                <Select
                  defaultValue="image"
                  onValueChange={(val: 'image' | 'video') => {
                    (window as any)._lastMediaType = val
                  }}
                >
                  <SelectTrigger className="w-[100px] h-10 rounded-xl bg-background border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">{t('image' as any)}</SelectItem>
                    <SelectItem value="video">{t('productVideos' as any)}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={t('imageUrlPlaceholder' as any)}
                  value={manualMediaUrl}
                  onChange={(e) => setManualMediaUrl(e.target.value)}
                  className="flex-1 h-10 rounded-xl bg-background border-white/10"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 rounded-xl px-6 font-bold"
                  onClick={() => {
                    const type = (window as any)._lastMediaType || 'image'
                    if (!manualMediaUrl) return
                    setFormData(prev => ({
                      ...prev,
                      media: [...prev.media, { id: `manual-${Date.now()}`, url: manualMediaUrl, type }]
                    }))
                    setManualMediaUrl('')
                  }}
                >
                  {t('add')}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-3 w-3" /> {t('price')} (IQD)
                </Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-12 text-lg font-black rounded-xl bg-muted/20 border-white/10 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Settings className="h-3 w-3" /> {t('costPrice' as any)} (IQD)
                </Label>
                <Input
                  type="number"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-11 rounded-xl bg-muted/20 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Star className="h-3 w-3" /> {t('discount')} (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                  className="h-11 rounded-xl bg-muted/20 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-3 w-3" /> {t('deliveryFee' as any)} (IQD)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.deliveryFee}
                  onChange={(e) => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-11 rounded-xl bg-muted/20 border-white/10"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-black flex items-center gap-2 uppercase tracking-tight">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  {t('needsDeposit')}
                </Label>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">{t('needsDepositDesc')}</p>
              </div>
              <Switch
                checked={formData.needsDeposit}
                onCheckedChange={(checked) => setFormData({ ...formData, needsDeposit: checked })}
              />
            </div>

            {formData.needsDeposit && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ms-1">
                      <DollarSign className="h-3 w-3" /> {t('depositAmount')}
                    </Label>
                    <Input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-12 text-lg font-black rounded-xl bg-background border-primary/20 focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-white/5 shadow-inner">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                formData.isActive ? "bg-success/20 text-success ring-4 ring-success/5" : "bg-muted/50 text-muted-foreground"
              )}>
                {formData.isActive ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
              </div>
              <div>
                <Label className="text-sm font-black uppercase tracking-tight">{t('active')}</Label>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">{formData.isActive ? t('visibleInStorefront') : t('hiddenFromBuyers')}</p>
              </div>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </TabsContent>

        <TabsContent value="options" className="space-y-8 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/10 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-lg font-black uppercase tracking-tight">
                  {t('productOptions')}
                </Label>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">{t('manageOptionsDesc')}</p>
              </div>
            </div>
            <Button type="button" variant="premium" size="lg" onClick={addOption} className="rounded-2xl h-12 px-8 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5 me-2" />
              {t('addOption')}
            </Button>
          </div>

          {formData.options.length === 0 ? (
            <div className="p-20 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-muted-foreground/30 bg-muted/5">
              <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center mb-6">
                <Plus className="h-10 w-10 opacity-20" />
              </div>
              <p className="text-base font-black uppercase tracking-widest">{t('noOptionsAdded' as any)}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.options.map((option, index) => (
                <div key={option.id} className="p-4 rounded-2xl border border-white/10 bg-white/5 relative group transition-all hover:border-primary/20 hover:bg-white/[0.07] shadow-lg overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-all duration-500" />

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs shadow-inner">
                        #{index + 1}
                      </div>
                      <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t('option' as any) || 'Option'}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-2xl transition-all"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Language Names */}
                    <div className="xl:col-span-5 space-y-5">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ms-1 flex items-center gap-2">
                          <Globe className="h-3 w-3" /> {t('name')}
                        </Label>
                        <Input
                          placeholder="e.g. Size"
                          value={option.name}
                          onChange={(e) => updateOptionName(index, e.target.value)}
                          className="bg-background/50 rounded-xl h-11 border-white/5 font-bold focus:ring-primary/20 text-base px-4 shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Type and Values */}
                    <div className="xl:col-span-7 space-y-8">
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ms-1">{t('optionType')}</Label>
                        <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 rounded-[1.5rem] border border-white/5 backdrop-blur-md">
                          {[
                            { id: 'choice', icon: CheckCircle2, label: 'Single' },
                            { id: 'multi-choice', icon: Layers, label: 'Multi' },
                            { id: 'text', icon: Edit, label: 'Text' },
                            { id: 'color', icon: Globe, label: 'Color' }
                          ].map((t) => (
                            <Button
                              key={t.id}
                              type="button"
                              variant={option.type === t.id || (!option.type && t.id === 'choice') ? 'secondary' : 'ghost'}
                              size="sm"
                              className={cn(
                                "flex-1 min-w-[90px] h-10 text-[10px] px-4 gap-2 rounded-xl font-black uppercase tracking-widest transition-all",
                                (option.type === t.id || (!option.type && t.id === 'choice'))
                                  ? "bg-white text-black shadow-lg"
                                  : "text-muted-foreground/60 hover:text-white"
                              )}
                              onClick={() => updateOptionType(index, t.id as any)}
                            >
                              <t.icon className="h-3.5 w-3.5" />
                              {t.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {(!option.type || option.type === 'choice' || option.type === 'multi-choice' || option.type === 'color') && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <Label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] ms-1">{t('choices')}</Label>
                            <div className="flex flex-wrap gap-2">
                              {['size', 'color', 'material'].map((preset) => (
                                <Button
                                  key={preset}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[9px] uppercase font-black text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-full px-3"
                                  onClick={() => applyOptionPreset(index, preset as any)}
                                >
                                  + {preset}
                                </Button>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[9px] uppercase font-black text-accent border-accent/20 bg-accent/5 hover:bg-accent/10 rounded-full px-3"
                                onClick={() => saveOptionAsPreset(index)}
                              >
                                <Save className="h-3.5 w-3.5 me-1.5" />
                                {t('saveAsPreset')}
                              </Button>
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-black/40 border border-white/5 min-h-[80px] focus-within:border-primary/40 transition-all shadow-inner flex flex-col">
                            <div className="flex flex-wrap gap-2 mb-4">
                              {option.values.map((val, vIdx) => (
                                <Badge
                                  key={vIdx}
                                  variant="secondary"
                                  className="h-8 pl-3 pr-1 gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-all group/tag rounded-xl shadow-sm"
                                >
                                  {option.swatches?.[val] && (
                                    <div
                                      className="h-4 w-4 rounded-full border-2 border-white/30 shadow-md"
                                      style={{ backgroundColor: option.swatches[val] }}
                                    />
                                  )}
                                  <span className="font-bold text-sm tracking-tight">{val}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full p-0 hover:bg-destructive/10 hover:text-destructive text-primary/30 transition-all"
                                    onClick={() => removeOptionValue(index, vIdx)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                            <div className="relative mt-auto">
                              <Input
                                placeholder={(option.type as string) === 'color' ? (isAr ? "اللون:الرمز & إدخال..." : "Color:Hex & Enter...") : (isAr ? "اكتب واضغط إدخال..." : "Type & Enter...")}
                                className="border-0 bg-white/5 h-12 focus-visible:ring-0 focus-visible:ring-offset-0 px-5 text-sm rounded-2xl w-full font-bold placeholder:text-muted-foreground/30 shadow-inner"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const raw = (e.target as HTMLInputElement).value.trim()
                                    if (!raw) return

                                    let val = raw
                                    let color = ''

                                    if (raw.includes(':')) {
                                      const parts = raw.split(':')
                                      val = parts[0].trim()
                                      color = parts[1].trim()
                                    } else if ((option.type as string) === 'color') {
                                      const standards: Record<string, string> = {
                                        'black': '#000000', 'white': '#FFFFFF', 'red': '#FF0000',
                                        'blue': '#0000FF', 'green': '#008000', 'yellow': '#FFFF00',
                                        'purple': '#800080', 'pink': '#FFC0CB', 'orange': '#FFA500',
                                        'gray': '#808080', 'brown': '#A52A2A', 'cyan': '#00FFFF'
                                      }
                                      color = standards[raw.toLowerCase()] || ''
                                    }

                                    addOptionValue(index, val)
                                    if (color) {
                                      setFormData(prev => {
                                        const newOptions = [...prev.options]
                                        newOptions[index].swatches = {
                                          ...(newOptions[index].swatches || {}),
                                          [val]: color
                                        }
                                        return { ...prev, options: newOptions }
                                      })
                                    }
                                    ;(e.target as HTMLInputElement).value = ''
                                  }
                                }}
                              />
                              <div className="absolute end-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-primary/40 pointer-events-none">
                                {t('pressEnter' as any) || 'Press Enter'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  variant="premium"
                  onClick={generateVariants}
                  className="rounded-full h-12 px-10 gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  <Layers className="h-5 w-5" />
                  {t('createVariantsMatrix')}
                </Button>
              </div>
            </div>
          )}

          {formData.variants.length > 0 && (
            <div className="space-y-4 border-t border-white/5 pt-6 mt-6">
                <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-base font-black uppercase tracking-tight">{t('generatedMatrix')}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">{t('manageVariantsDesc')}</p>
                </div>
              </div>

              <div className="space-y-4">
                {formData.variants.map((variant, index) => (
                  <div key={variant.id} className="p-3 rounded-xl border border-white/5 bg-muted/5 flex flex-col xl:flex-row gap-3 items-center transition-all hover:bg-muted/10 hover:border-white/10">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "h-14 w-14 rounded-2xl border-2 flex items-center justify-center cursor-pointer overflow-hidden transition-all group/vimg relative",
                          variant.imageId ? "border-primary/50 shadow-lg shadow-primary/10" : "border-white/10 bg-white/5 hover:border-primary/30"
                        )}
                        onClick={() => {
                          const media = formData.media.filter(m => m.type === 'image')
                          if (media.length === 0) return toast.error('Add product media first')

                          // Simple cyclic selection for now
                          const currentIndex = media.findIndex(m => m.id === variant.imageId)
                          const nextIndex = (currentIndex + 1) % media.length
                          const newVariants = [...formData.variants]
                          newVariants[index].imageId = media[nextIndex].id
                          setFormData({ ...formData, variants: newVariants })
                        }}
                      >
                        {variant.imageId ? (
                          <img
                            src={formData.media.find(m => m.id === variant.imageId)?.url}
                            className="h-full w-full object-cover transition-transform group-hover/vimg:scale-110"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 opacity-20 group-hover/vimg:opacity-50" />
                        )}
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/vimg:opacity-100 flex items-center justify-center transition-opacity">
                          <Plus className="h-4 w-4 text-primary drop-shadow-lg" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(variant.optionValues).map(([name, value]) => (
                            <Badge key={name} variant="secondary" className="bg-primary/5 text-primary border-primary/10 rounded-xl py-1.5 px-3">
                              <span className="opacity-50 text-[10px] font-black uppercase me-2 tracking-tighter">{name}:</span>
                              <span className="font-bold">{value}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ps-1 opacity-60">{t('variantSku')}</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => {
                            const newVariants = [...formData.variants]
                            newVariants[index].sku = e.target.value
                            setFormData({ ...formData, variants: newVariants })
                          }}
                          className="h-10 text-xs font-mono rounded-xl bg-background border-white/10 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ps-1 opacity-60">{t('priceOverride')}</Label>
                        <Input
                          type="number"
                          value={variant.priceOverride}
                          onChange={(e) => {
                            const newVariants = [...formData.variants]
                            newVariants[index].priceOverride = parseFloat(e.target.value) || 0
                            setFormData({ ...formData, variants: newVariants })
                          }}
                          className="h-10 text-xs rounded-xl bg-background border-white/10 font-bold focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ps-1 opacity-60">{t('stockLevel')}</Label>
                        <Input
                          type="number"
                          value={variant.stockQuantity}
                          onChange={(e) => {
                            const newVariants = [...formData.variants]
                            newVariants[index].stockQuantity = parseInt(e.target.value) || 0
                            setFormData({ ...formData, variants: newVariants })
                          }}
                          className="h-10 text-xs rounded-xl bg-background border-white/10 font-bold focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between glass-card p-4 rounded-2xl border-white/10 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative group">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 w-full sm:w-72 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl transition-all h-11"
            />
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="premium" className="h-11 px-8" onClick={resetForm}>
              <Plus className="h-4 w-4 me-2" />
              {t('add')} {t('product')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl glass-card border-white/10 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t('add')} {t('product')}</DialogTitle>
              <DialogDescription>
                {t('addNewProductToStore' as any)}
              </DialogDescription>
            </DialogHeader>
            {ProductFormFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!formData.storeId || !formData.productTypeId || !formData.title}
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl glass-card border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-white/5 border-b border-white/10 hover:bg-white/5">
                <TableHead className="w-[100px] text-muted-foreground font-bold uppercase text-xs tracking-widest py-5">{t('productImages' as any)}</TableHead>
                <TableHead className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t('name' as any)}</TableHead>
                <TableHead className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t('productCodeSku' as any)}</TableHead>
                <TableHead className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t('price' as any)}</TableHead>
                <TableHead className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t('status' as any)}</TableHead>
                {!storeId && <TableHead className="text-muted-foreground font-bold uppercase text-xs tracking-widest">{t('stores' as any)}</TableHead>}
                <TableHead className="text-muted-foreground font-bold uppercase text-xs tracking-widest text-end">{t('actions' as any)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-transparent border-b border-border/50">
                    <TableCell><Skeleton className="w-14 h-14 rounded-2xl" /></TableCell>
                    <TableCell>
                      <div className="space-y-3">
                        <Skeleton className="w-48 h-5 rounded-lg" />
                        <Skeleton className="w-32 h-4 rounded-lg opacity-50" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="w-24 h-5 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="w-28 h-6 rounded-lg" /></TableCell>
                    <TableCell><Skeleton className="w-20 h-7 rounded-full" /></TableCell>
                    {!storeId && <TableCell><Skeleton className="w-28 h-5 rounded-lg" /></TableCell>}
                    <TableCell className="text-end"><Skeleton className="w-10 h-10 rounded-xl ms-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={storeId ? 6 : 7} className="text-center py-12 text-muted-foreground/60">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">{t('noData' as any)}</p>
                    <p className="text-sm">{t('startAdding' as any)}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const store = stores.find(s => s.id === product.storeId)
                  const finalPrice = product.discount
                    ? product.price * (1 - product.discount / 100)
                    : product.price

                  return (
                    <TableRow key={product.id} className="transition-colors hover:bg-white/5 border-b border-white/5 last:border-0">
                      <TableCell>
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-muted group">
                          {product.media && product.media.length > 0 ? (
                            <img
                              src={product.media.find(m => m.type === 'image')?.url || product.media[0].url}
                              alt={product.title}
                              className="h-full w-full object-cover transition-transform group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <p className="font-bold text-sm">{product.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">
                            {product.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {product.sku ? (
                            <code className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded w-fit border border-white/5">{product.sku}</code>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">{t('noSku' as any) || 'No SKU'}</span>
                          )}
                          <div className="flex items-center gap-1 text-[9px] uppercase text-muted-foreground/80 font-black">
                            {product.productCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <p className="font-bold text-sm whitespace-nowrap">
                            {finalPrice.toLocaleString('en-US')} <span className="text-[10px] font-normal opacity-70">IQD</span>
                          </p>
                          {(product.discount || 0) > 0 && (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-muted-foreground line-through opacity-50">
                                {product.price.toLocaleString('en-US')}
                              </p>
                              <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-success/10 text-success border-success/20">
                                {product.discount}%
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.isActive ? 'default' : 'secondary'}
                          className={cn(
                            "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            product.isActive ? "bg-primary/20 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {product.isActive ? t('active') : t('inactive')}
                        </Badge>
                      </TableCell>
                      {!storeId && (
                        <TableCell>
                          <Badge variant="outline" className="font-medium bg-white/5 border-white/10 text-[10px]">
                            {store?.name}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card border-white/10 min-w-[160px]">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80">{t('actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem asChild className="focus:bg-primary/20 focus:text-primary">
                              <Link href={getStoreUrl(store?.slug || '', `/product/${product.id}`)} target="_blank" className="flex items-center">
                                <ExternalLink className="h-3.5 w-3.5 me-2" />
                                {t('viewProduct' as any)}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(product)} className="focus:bg-primary/20 focus:text-primary">
                              <Edit className="h-3.5 w-3.5 me-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            {!isEmployee && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product)
                                    setIsTelegramModalOpen(true)
                                  }}
                                  className="focus:bg-primary/20 focus:text-primary"
                                >
                                  <Send className="h-3.5 w-3.5 me-2" />
                                  {t('postToTelegram' as any) || 'Post to Telegram'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(product.id)}
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 me-2" />
                                  {t('delete')}
                                </DropdownMenuItem>
                              </>
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl glass-card border-white/10 shadow-2xl">
          <DialogHeader>
            <DialogTitle>{t('edit')} {t('product')}</DialogTitle>
            <DialogDescription>
              {t('updateProductInfo' as any)}
            </DialogDescription>
          </DialogHeader>
          {ProductFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={!formData.productTypeId || !formData.title}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TelegramPreviewModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        product={selectedProduct}
        store={stores.find(s => s.id === selectedProduct?.storeId) || null}
      />
    </div>
  )
}
