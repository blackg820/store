'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getStoreUrl } from '@/lib/store-utils'
import { Media } from '@/lib/types'



interface ProductsTableProps {
  storeId?: string
  userId?: string
}

export function ProductsTable({ storeId, userId }: ProductsTableProps) {
  const { language, user } = useAuth()
  const { t } = useTranslations()
  const { 
    products, stores, getStoresByUserId, 
    addProduct, updateProduct, deleteProduct, 
    updateStore,
    isDataLoading, selectedStoreId 
  } = useData()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [storeFilter, setStoreFilter] = useState<string>(storeId || 'all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  // Form state
  const [formData, setFormData] = useState<{
    storeId: string
    sku: string
    title: string
    titleAr: string
    titleKu: string
    description: string
    descriptionAr: string
    descriptionKu: string
    price: number
    costPrice: number
    discount: number
    deliveryFee: number
    needsDeposit: boolean
    depositAmount: number
    depositAmountAr: number
    depositAmountKu: number
    isActive: boolean
    options: ProductOption[]
    variants: ProductVariant[]
    media: Array<{ id: string; url: string; type: 'image' | 'video' }>
    productTypeId: string
    customData: any
  }>({
    storeId: storeId || '',
    sku: '',
    title: '',
    titleAr: '',
    titleKu: '',
    description: '',
    descriptionAr: '',
    descriptionKu: '',
    price: 0,
    costPrice: 0,
    discount: 0,
    deliveryFee: 0,
    needsDeposit: false,
    depositAmount: 0,
    depositAmountAr: 0,
    depositAmountKu: 0,
    isActive: true,
    options: [],
    variants: [],
    media: [],
    productTypeId: '',
    customData: {}
  })

  const [showTranslations, setShowTranslations] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [manualMediaUrl, setManualMediaUrl] = useState('')

  // Get user's stores for filtering
  const userStores = userId 
    ? stores.filter(s => s.userId === userId)
    : user?.role === 'admin' 
      ? stores 
      : stores.filter(s => s.userId === user?.id)
  // Filter products
  let filteredProducts = selectedStoreId 
    ? products.filter(p => p.storeId === selectedStoreId)
    : products

  if (userId) {
    const userStoreIds = stores.filter(s => s.userId === userId).map(s => s.id)
    filteredProducts = filteredProducts.filter(p => userStoreIds.includes(p.storeId))
  } else if (user?.role !== 'admin') {
    const userStoreIds = stores.filter(s => s.userId === user?.id).map(s => s.id)
    filteredProducts = filteredProducts.filter(p => userStoreIds.includes(p.storeId))
  }

  if (storeFilter && storeFilter !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.storeId === storeFilter)
  }

  if (searchQuery) {
    filteredProducts = filteredProducts.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.titleAr && p.titleAr.includes(searchQuery)) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const resetForm = () => {
    setFormData({
      storeId: storeId || '',
      sku: '',
      title: '',
      titleAr: '',
      titleKu: '',
      description: '',
      descriptionAr: '',
      descriptionKu: '',
      price: 0,
      costPrice: 0,
      discount: 0,
      deliveryFee: 0,
      needsDeposit: false,
      depositAmount: 0,
      depositAmountAr: 0,
      depositAmountKu: 0,
      isActive: true,
      options: [],
      variants: [],
      media: [],
      productTypeId: '',
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
        titleAr: formData.titleAr,
        titleKu: formData.titleKu,
        description: formData.description,
        descriptionAr: formData.descriptionAr,
        descriptionKu: formData.descriptionKu,
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
      titleAr: product.titleAr || '',
      titleKu: product.titleKu || '',
      description: product.description || '',
      descriptionAr: product.descriptionAr || '',
      descriptionKu: product.descriptionKu || '',
      price: product.price,
      costPrice: product.costPrice || 0,
      discount: product.discount || 0,
      deliveryFee: product.deliveryFee || 0,
      needsDeposit: product.needsDeposit || false,
      depositAmount: product.depositAmount || 0,
      depositAmountAr: (product as any).depositAmountAr || 0,
      depositAmountKu: (product as any).depositAmountKu || 0,
      isActive: product.isActive,
      options: product.options || [],
      variants: product.variants || [],
      media: product.media || [],
      productTypeId: product.productTypeId || '',
      customData: product.customData || {}
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (selectedProduct) {
      try {
        await updateProduct(selectedProduct.id, {
          sku: formData.sku || undefined,
          title: formData.title,
          titleAr: formData.titleAr,
          titleKu: formData.titleKu,
          description: formData.description,
          descriptionAr: formData.descriptionAr,
          descriptionKu: formData.descriptionKu,
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

  const updateOptionNameAr = (index: number, name: string) => {
    setFormData(prev => {
      const newOptions = [...prev.options]
      newOptions[index].nameAr = name
      return { ...prev, options: newOptions }
    })
  }

  const updateOptionNameKu = (index: number, name: string) => {
    setFormData(prev => {
      const newOptions = [...prev.options]
      newOptions[index].nameKu = name
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

  const updateOptionType = (index: number, type: 'choice' | 'text' | 'multi-choice') => {
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
      size: { name: 'Size', nameAr: 'المقاس', nameKu: 'قەبارە', values: ['S', 'M', 'L', 'XL', 'XXL'] },
      color: { 
        name: 'Color', nameAr: 'اللون', nameKu: 'ڕەنگ', 
        values: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Purple'],
        swatches: {
          'Black': '#000000', 'White': '#FFFFFF', 'Red': '#FF0000', 
          'Blue': '#0000FF', 'Green': '#008000', 'Yellow': '#FFFF00', 'Purple': '#800080'
        }
      },
      material: { name: 'Material', nameAr: 'المادة', nameKu: 'ماددە', values: ['Cotton', 'Silk', 'Polyester', 'Leather'] }
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
        nameAr: option.nameAr,
        nameKu: option.nameKu,
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
      toast.error(t('addOptionsFirst' as any))
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
    toast.success(`${newVariants.length} ${t('variantsGenerated' as any)}`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !formData.storeId) {
      if (!formData.storeId) toast.error(t('selectStoreFirst' as any))
      return
    }

    setIsUploading(true)
    const toastId = toast.loading(t('uploadingImage' as any))

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

      const result = await res.json()
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          media: [...prev.media, result.data]
        }))
        toast.success(t('imageUploaded' as any), { id: toastId })
      } else {
        toast.error(result.error || t('uploadFailed' as any), { id: toastId })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(t('connectionError' as any), { id: toastId })
    } finally {
      setIsUploading(false)
    }
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
            <span className="hidden sm:inline">{t('general' as any)}</span>
          </TabsTrigger>
          <TabsTrigger value="media" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('media' as any) || 'Media'}</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('pricing' as any) || 'Pricing'}</span>
          </TabsTrigger>
          <TabsTrigger value="options" className="rounded-lg gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">{t('options' as any) || 'Options'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!storeId && userStores.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1 flex items-center gap-2">
                  <Package className="h-3 w-3" /> {t('selectStoreLabel' as any)}
                </Label>
                <Select 
                  value={formData.storeId} 
                  onValueChange={(val) => setFormData({ ...formData, storeId: val })}
                >
                  <SelectTrigger className="rounded-xl bg-muted/20 border-white/10 h-11 focus:ring-primary/20">
                    <SelectValue placeholder={t('selectStore' as any)} />
                  </SelectTrigger>
                  <SelectContent>
                    {userStores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {language === 'ar' ? store.nameAr : store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1 flex items-center gap-2">
                <Settings className="h-3 w-3" /> {t('productType' as any)}
              </Label>
              <Select 
                value={formData.productTypeId} 
                onValueChange={(val) => setFormData({ ...formData, productTypeId: val })}
              >
                <SelectTrigger className="rounded-xl bg-muted/20 border-white/10 h-11 focus:ring-primary/20">
                  <SelectValue placeholder={t('selectProductType' as any)} />
                </SelectTrigger>
                <SelectContent>
                  {useData().getProductTypesByStoreId(formData.storeId)
                    .map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          {(!type.storeId || type.storeId === 'null') && <Globe className="h-3 w-3 text-primary" />}
                          {language === 'ar' ? type.nameAr : type.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Languages className="h-4 w-4 text-primary" />
                {t('details' as any) || 'Product Details'}
              </Label>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                className={cn("h-7 text-[10px] uppercase font-black tracking-widest transition-all", showTranslations ? "text-primary bg-primary/5" : "text-muted-foreground")}
                onClick={() => setShowTranslations(!showTranslations)}
              >
                <Plus className={cn("h-3 w-3 me-2 transition-transform", showTranslations && "rotate-45")} />
                {showTranslations ? t('hideTranslations' as any) || 'Hide Others' : t('showTranslations' as any) || 'Add Other Languages'}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3 p-5 rounded-[2rem] bg-primary/5 border border-primary/10 shadow-inner">
                <div className="flex items-center gap-2 text-primary">
                  <Globe className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t('primary' as any) || 'Primary Language'} (English)</span>
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

              {showTranslations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* Arabic Translation */}
                  <div className="space-y-3 p-5 rounded-[2rem] bg-accent/5 border border-accent/10 shadow-inner" dir="rtl">
                    <div className="flex items-center gap-2 text-accent">
                      <span className="text-[10px] font-black uppercase tracking-widest">العربية</span>
                    </div>
                    <Input
                      value={formData.titleAr}
                      onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
                      placeholder="اسم المنتج بالعربية..."
                      className="h-11 bg-background border-white/10 rounded-xl text-right font-bold focus:ring-accent/20"
                    />
                    <Textarea
                      value={formData.descriptionAr}
                      onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                      placeholder="وصف المنتج بالعربية..."
                      rows={2}
                      className="bg-background border-white/10 rounded-2xl text-right resize-none focus:ring-accent/20"
                    />
                  </div>

                  {/* Kurdish Translation */}
                  <div className="space-y-3 p-5 rounded-[2rem] bg-success/5 border border-success/10 shadow-inner" dir="rtl">
                    <div className="flex items-center gap-2 text-success">
                      <span className="text-[10px] font-black uppercase tracking-widest">کوردی</span>
                    </div>
                    <Input
                      value={formData.titleKu}
                      onChange={(e) => setFormData({ ...formData, titleKu: e.target.value })}
                      placeholder="ناوی بەرهەم بە کوردی..."
                      className="h-11 bg-background border-white/10 rounded-xl text-right font-bold focus:ring-success/20"
                    />
                    <Textarea
                      value={formData.descriptionKu}
                      onChange={(e) => setFormData({ ...formData, descriptionKu: e.target.value })}
                      placeholder="وەسفی بەرهەم بە کوردی..."
                      rows={2}
                      className="bg-background border-white/10 rounded-2xl text-right resize-none focus:ring-success/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                {t('productPhotos')}
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
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
                        {t('addMedia' as any) || 'Add File'}
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

          <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-6 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-black flex items-center gap-2 uppercase tracking-tight">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  {t('needsDeposit' as any) || 'Needs Deposit'}
                </Label>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Require partial payment before processing</p>
              </div>
              <Switch
                checked={formData.needsDeposit}
                onCheckedChange={(checked) => setFormData({ ...formData, needsDeposit: checked })}
              />
            </div>

            {formData.needsDeposit && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ms-1">
                      <Globe className="h-3 w-3" /> English
                    </Label>
                    <Input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-12 text-lg font-black rounded-xl bg-background border-primary/20 focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2" dir="rtl">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 me-1">
                      <Globe className="h-3 w-3" /> العربية
                    </Label>
                    <Input
                      type="number"
                      value={formData.depositAmountAr}
                      onChange={(e) => setFormData({ ...formData, depositAmountAr: parseFloat(e.target.value) || 0 })}
                      placeholder="٠"
                      className="h-12 text-lg font-black rounded-xl bg-background border-primary/20 text-right focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2" dir="rtl">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 me-1">
                      <Globe className="h-3 w-3" /> کوردی
                    </Label>
                    <Input
                      type="number"
                      value={formData.depositAmountKu}
                      onChange={(e) => setFormData({ ...formData, depositAmountKu: parseFloat(e.target.value) || 0 })}
                      placeholder="٠"
                      className="h-12 text-lg font-black rounded-xl bg-background border-primary/20 text-right focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between p-5 rounded-[2rem] bg-muted/20 border border-white/5 shadow-inner">
            <div className="flex items-center gap-4">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg",
                formData.isActive ? "bg-success/20 text-success ring-4 ring-success/5" : "bg-muted/50 text-muted-foreground"
              )}>
                {formData.isActive ? <Check className="h-6 w-6" /> : <X className="h-6 w-6" />}
              </div>
              <div>
                <Label className="text-sm font-black uppercase tracking-tight">{t('active')}</Label>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">{formData.isActive ? 'Visible in storefront' : 'Hidden from buyers'}</p>
              </div>
            </div>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </TabsContent>

        <TabsContent value="options" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between bg-muted/20 p-5 rounded-[2rem] border border-white/5">
            <div className="space-y-1">
              <Label className="text-base font-black flex items-center gap-2 uppercase tracking-tight">
                <Layers className="h-4 w-4 text-primary" />
                {t('productOptions' as any)}
              </Label>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">{t('manageOptionsDesc' as any) || 'Add options like Size, Color to your product.'}</p>
            </div>
            <Button type="button" variant="premium" size="sm" onClick={addOption} className="rounded-xl h-10 px-6">
              <Plus className="h-4 w-4 me-2" />
              {t('addOption' as any)}
            </Button>
          </div>
          
          {formData.options.length === 0 ? (
            <div className="p-12 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/5">
              <div className="h-16 w-16 rounded-3xl bg-muted/10 flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 opacity-20" />
              </div>
              <p className="text-sm font-black uppercase tracking-widest">{t('noOptionsAdded' as any)}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {formData.options.map((option, index) => (
                <div key={option.id} className="p-6 rounded-[2.5rem] border border-white/10 bg-muted/10 relative group transition-all hover:border-primary/30 hover:bg-muted/20 shadow-xl overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 end-4 h-8 w-8 text-destructive/30 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                    onClick={() => removeOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ms-1">{t('optionName' as any)} (English)</Label>
                        <Input 
                          placeholder="e.g. Size" 
                          value={option.name} 
                          onChange={(e) => updateOptionName(index, e.target.value)}
                          className="bg-background rounded-xl h-11 border-white/10 font-bold focus:ring-primary/20"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2" dir="rtl">
                          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest me-1">العربية</Label>
                          <Input 
                            placeholder="المقاس..." 
                            value={option.nameAr || ''} 
                            onChange={(e) => updateOptionNameAr(index, e.target.value)}
                            className="bg-background rounded-xl h-11 text-right border-white/10 focus:ring-primary/20"
                          />
                        </div>
                        <div className="space-y-2" dir="rtl">
                          <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest me-1">کوردی</Label>
                          <Input 
                            placeholder="قەبارە..." 
                            value={option.nameKu || ''} 
                            onChange={(e) => updateOptionNameKu(index, e.target.value)}
                            className="bg-background rounded-xl h-11 text-right border-white/10 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('optionType' as any) || 'Selection Type'}</Label>
                        <div className="flex gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
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
                              className="h-8 text-[10px] px-3 gap-2 rounded-lg font-black uppercase tracking-tighter transition-all"
                              onClick={() => updateOptionType(index, t.id as any)}
                            >
                              <t.icon className="h-3 w-3" />
                              {t.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {(!option.type || option.type === 'choice' || option.type === 'multi-choice') && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t('choices' as any) || 'Values'}</Label>
                            <div className="flex gap-2">
                              {Object.keys({
                                size: 1, color: 1, material: 1, 
                                ...(stores.find(s => s.id === formData.storeId)?.optionPresets || {})
                              }).map((preset) => (
                                <Button 
                                  key={preset}
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[9px] uppercase font-black text-primary hover:bg-primary/10 rounded-md"
                                  onClick={() => applyOptionPreset(index, preset as any)}
                                >
                                  + {preset}
                                </Button>
                              ))}
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[9px] uppercase font-black text-accent hover:bg-accent/10 rounded-md border border-accent/20 px-2"
                                onClick={() => saveOptionAsPreset(index)}
                              >
                                <Save className="h-3 w-3 me-1" />
                                {t('saveAsPreset' as any) || 'Save Preset'}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-black/20 border border-white/5 min-h-[50px] focus-within:border-primary/30 transition-all">
                            {option.values.map((val, vIdx) => (
                              <Badge 
                                key={vIdx} 
                                variant="secondary" 
                                className="h-8 pl-3 pr-1 gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-all group/tag rounded-lg"
                              >
                                {option.swatches?.[val] && (
                                  <div 
                                    className="h-3 w-3 rounded-full border border-white/20 shadow-sm" 
                                    style={{ backgroundColor: option.swatches[val] }} 
                                  />
                                )}
                                <span className="font-bold">{val}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 rounded-full p-0 hover:bg-primary/20 text-primary/40 group-hover/tag:text-primary transition-colors"
                                  onClick={() => removeOptionValue(index, vIdx)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                            <Input
                              placeholder={(option.type as string) === 'color' ? "Red:#FF0000 & Enter..." : "Type & Enter..."}
                              className="border-0 bg-transparent h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 text-xs w-32 flex-1 font-medium"
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
                                    // Try to infer color if it's a standard name
                                    const standards: Record<string, string> = {
                                      'black': '#000000', 'white': '#FFFFFF', 'red': '#FF0000',
                                      'blue': '#0000FF', 'green': '#008000', 'yellow': '#FFFF00'
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
                  {t('generateVariants' as any) || 'Create Variants Matrix'}
                </Button>
              </div>
            </div>
          )}

          {formData.variants.length > 0 && (
            <div className="space-y-6 border-t border-white/5 pt-10 mt-10">
              <div className="flex items-center gap-4 bg-primary/5 p-5 rounded-[2rem] border border-primary/10">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-base font-black uppercase tracking-tight">{t('productVariants' as any) || 'Generated Matrix'}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-60">Manage individual prices and stock levels</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {formData.variants.map((variant, index) => (
                  <div key={variant.id} className="p-6 rounded-[2.5rem] border border-white/5 bg-muted/5 flex flex-col xl:flex-row gap-6 items-center transition-all hover:bg-muted/10 hover:border-white/10">
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(variant.optionValues).map(([name, value]) => (
                          <Badge key={name} variant="secondary" className="bg-primary/5 text-primary border-primary/10 rounded-xl py-1.5 px-3">
                            <span className="opacity-50 text-[10px] font-black uppercase me-2 tracking-tighter">{name}:</span> 
                            <span className="font-bold">{value}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full xl:w-auto">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ps-1 opacity-60">Variant SKU</Label>
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
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ps-1 opacity-60">Price Override</Label>
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
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ps-1 opacity-60">Stock Level</Label>
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
          {!storeId && userStores.length > 1 && (
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 rounded-xl h-11">
                <SelectValue placeholder={t('filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {userStores.map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {language === 'ar' ? store.nameAr : store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="premium" className="h-11 px-8" onClick={resetForm}>
              <Plus className="h-4 w-4 me-2" />
              {t('add')} {t('product')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl glass-card border-white/10 shadow-2xl">
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
                disabled={!formData.storeId || !formData.productTypeId || (!formData.title && !formData.titleAr && !formData.titleKu)}
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
                  <TableRow key={i}>
                    <TableCell><div className="w-12 h-12 bg-muted/20 animate-pulse rounded-lg" /></TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="w-32 h-4 bg-muted/20 animate-pulse rounded" />
                        <div className="w-24 h-3 bg-muted/20 animate-pulse rounded" />
                      </div>
                    </TableCell>
                    <TableCell><div className="w-20 h-4 bg-muted/20 animate-pulse rounded" /></TableCell>
                    <TableCell><div className="w-24 h-4 bg-muted/20 animate-pulse rounded" /></TableCell>
                    <TableCell><div className="w-16 h-6 bg-muted/20 animate-pulse rounded-lg" /></TableCell>
                    {!storeId && <TableCell><div className="w-24 h-4 bg-muted/20 animate-pulse rounded-lg" /></TableCell>}
                    <TableCell className="text-end"><div className="w-8 h-8 bg-muted/20 animate-pulse rounded-full ml-auto" /></TableCell>
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
                          <p className="font-bold text-sm">{language === 'ar' ? product.titleAr || product.title : product.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">
                            {language === 'ar' ? product.descriptionAr || product.description : product.description}
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
                            {finalPrice.toLocaleString()} <span className="text-[10px] font-normal opacity-70">IQD</span>
                          </p>
                          {(product.discount || 0) > 0 && (
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-muted-foreground line-through opacity-50">
                                {product.price.toLocaleString()}
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
                            {language === 'ar' ? store?.nameAr || store?.name : store?.name}
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
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(product.id)}
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 me-2" />
                              {t('delete')}
                            </DropdownMenuItem>
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
        <DialogContent className="max-w-2xl">
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
            <Button onClick={handleSaveEdit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
