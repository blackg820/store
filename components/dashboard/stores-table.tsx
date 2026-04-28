'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { useAuth } from '@/lib/auth-context'
import type { Store } from '@/lib/types'
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
  MoreHorizontal, Search, Plus, Eye, Edit, Trash2, ExternalLink, 
  Copy, Store as StoreIcon, Truck, Palette, CheckCircle2, 
  Upload, Link as LinkIcon, Loader2, X, Layout, MessageSquare, 
  Settings2, Globe2, AlertCircle, Save, Lock, Send, User
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { THEME_SUGGESTIONS } from '@/lib/themes'
import { getStoreUrl } from '@/lib/store-utils'

interface StoresTableProps {
  userId?: string
  showOwner?: boolean
}

/**
 * Premium Store Management Component
 * Features: 3-step wizard, glassmorphism UI, responsive design
 */
export function StoresTable({ userId, showOwner = false }: StoresTableProps) {
  const { language, user } = useAuth()
  const { t } = useTranslations()
  const { stores, users, addStore, updateStore, deleteStore, getProductsByStoreId, getOrdersByStoreId, isDataLoading } = useData()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [step, setStep] = useState(1)
  
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    slug: '',
    whatsappNumber: '',
    description: '',
    descriptionAr: '',
    logoUrl: '',
    coverUrl: '',
    isActive: true,
    globalDiscount: 0,
    deliveryDays: 3,
    telegramToken: '',
    telegramChatId: '',
    themeSettings: {
      primaryColor: '#2563eb',
      accentColor: '#3b82f6',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter',
      themeName: 'Default'
    },
    notificationMethod: 'telegram' as 'telegram' | 'whatsapp' | 'both',
    telegramUserId: '',
    telegramGroupId: ''
  })
  
  const [isUploading, setIsUploading] = useState<{ logo?: boolean, cover?: boolean }>({})
  const [logoMode, setLogoMode] = useState<'url' | 'upload'>('url')
  const [coverMode, setCoverMode] = useState<'url' | 'upload'>('url')

  const filteredStores = stores.filter(s => {
    const matchesUser = !userId || s.userId === userId
    const matchesSearch = !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameAr.includes(searchQuery) ||
      s.slug.includes(searchQuery.toLowerCase())
    return matchesUser && matchesSearch
  })

  const resetForm = () => {
    setFormData({
      name: '',
      nameAr: '',
      slug: '',
      whatsappNumber: '',
      description: '',
      descriptionAr: '',
      logoUrl: '',
      coverUrl: '',
      isActive: true,
      globalDiscount: 0,
      deliveryDays: 3,
      telegramToken: '',
      telegramChatId: '',
      themeSettings: {
        primaryColor: '#2563eb',
        accentColor: '#3b82f6',
        backgroundColor: '#ffffff',
        fontFamily: 'Inter',
        themeName: 'Default'
      },
      notificationMethod: 'telegram',
      telegramUserId: '',
      telegramGroupId: ''
    })
    setStep(1)
    setLogoMode('url')
    setCoverMode('url')
  }

  const handleNameChange = (val: string) => {
    setFormData(prev => ({
      ...prev,
      name: val,
      slug: !selectedStore ? val.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') : prev.slug
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover', sId?: string | number) => {
    const file = e.target.files?.[0]
    if (!file) return

    const uploadStoreId = sId ? String(sId) : "0" 
    setIsUploading(prev => ({ ...prev, [type]: true }))
    
    try {
      const token = localStorage.getItem('storify_access_token')
      const fd = new FormData()
      fd.append('file', file)
      fd.append('storeId', uploadStoreId)

      const response = await fetch('/api/v1/media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      })

      const data = await response.json()
      if (data.success && data.data) {
        setFormData(prev => ({ 
          ...prev, 
          [type === 'logo' ? 'logoUrl' : 'coverUrl']: data.data.url 
        }))
        toast.success(t('success'))
      } else {
        toast.error(data.error || t('error'))
      }
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setIsUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleAdd = async () => {
    const targetUserId = userId || user?.id
    if (!targetUserId) return
    if (!formData.name || !formData.slug) {
      toast.error(t('allFieldsRequired' as any))
      return
    }
    try {
      const newStore = await addStore({
        ...formData,
        nameAr: formData.nameAr || formData.name,
        descriptionAr: formData.descriptionAr || formData.description,
        userId: targetUserId,
        notificationSettings: {
          notificationMethod: formData.notificationMethod,
          newOrders: true,
          orderConfirmations: true,
          statusChanges: true,
          riskAlerts: true
        }
      })
      
      setIsAddDialogOpen(false)
      resetForm()
      return newStore
    } catch (e) {
      throw e
    }
  }

  const handleUpdate = async () => {
    if (!selectedStore) return
    try {
      await updateStore(selectedStore.id, {
        ...formData,
        nameAr: formData.nameAr || formData.name,
        descriptionAr: formData.descriptionAr || formData.description,
        notificationSettings: {
          notificationMethod: formData.notificationMethod,
          newOrders: selectedStore.notificationSettings?.newOrders ?? true,
          orderConfirmations: selectedStore.notificationSettings?.orderConfirmations ?? true,
          statusChanges: selectedStore.notificationSettings?.statusChanges ?? true,
          riskAlerts: selectedStore.notificationSettings?.riskAlerts ?? true
        }
      })
      setIsEditDialogOpen(false)
      setSelectedStore(null)
      resetForm()
    } catch (e) {}
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('deleteStoreConfirm' as any))) {
      try { await deleteStore(id) } catch (e) {}
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 glass-card p-4 rounded-3xl border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-background/50 border-white/5 focus:ring-primary/20 rounded-2xl h-12 text-sm"
          />
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="premium" className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20" onClick={resetForm}>
              <Plus className="h-5 w-5 me-2" />
              {t('add')} {t('stores')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] sm:rounded-[3.5rem] ring-1 ring-white/10">
            <div className="flex flex-col max-h-[90vh] sm:max-h-[85vh]">
              <div className="p-8 sm:p-10 pb-6 border-b border-white/5 bg-white/5">
                <DialogHeader>
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-3xl bg-primary/20 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                      <Plus className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{t('add')} {t('stores')}</DialogTitle>
                      <DialogDescription className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">{t('createStorefront' as any)}</DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <StoreFormFields 
                  formData={formData} setFormData={setFormData}
                  step={step} setStep={setStep}
                  handleFileUpload={handleFileUpload} isUploading={isUploading}
                  logoMode={logoMode} setLogoMode={setLogoMode}
                  coverMode={coverMode} setCoverMode={setCoverMode}
                  handleNameChange={handleNameChange}
                  handleAdd={handleAdd} handleUpdate={handleUpdate}
                  t={t} language={language}
                  telegramUserId={formData.telegramUserId}
                  telegramGroupId={formData.telegramGroupId}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stores List */}
      <div className="glass-card rounded-[2.5rem] border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[100px] py-6 font-black uppercase text-[10px] tracking-widest opacity-60 ps-8">{t('logo' as any)}</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest opacity-60">{t('storeName')}</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-widest opacity-60">{t('storeSlug')}</TableHead>
              {showOwner && <TableHead className="font-black uppercase text-[10px] tracking-widest opacity-60">{t('owner')}</TableHead>}
              <TableHead className="font-black uppercase text-[10px] tracking-widest opacity-60">{t('status')}</TableHead>
              <TableHead className="text-right font-black uppercase text-[10px] tracking-widest opacity-60 pe-8">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDataLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell className="ps-8"><div className="h-12 w-12 rounded-2xl bg-white/5 animate-pulse" /></TableCell>
                  <TableCell><div className="h-4 w-32 bg-white/5 animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-3 w-20 bg-white/5 animate-pulse rounded" /></TableCell>
                  <TableCell><div className="h-6 w-16 bg-white/5 animate-pulse rounded-full" /></TableCell>
                  <TableCell className="text-right pe-8"><div className="h-8 w-8 bg-white/5 animate-pulse rounded ml-auto" /></TableCell>
                </TableRow>
               ))
            ) : filteredStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-24 text-muted-foreground/30">
                  <StoreIcon className="h-20 w-20 mx-auto mb-4 opacity-10" />
                  <p className="font-black uppercase tracking-widest text-xs">{t('noStoresYet')}</p>
                </TableCell>
              </TableRow>
            ) : filteredStores.map((store) => (
              <TableRow key={store.id} className="group hover:bg-white/5 border-white/5 transition-all">
                <TableCell className="ps-8">
                  <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 overflow-hidden relative shadow-lg group-hover:scale-105 transition-transform">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <StoreIcon className="h-6 w-6 absolute inset-0 m-auto opacity-10" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-black text-sm tracking-tight group-hover:text-primary transition-colors">{store.name}</span>
                    <span className="text-[10px] opacity-40 font-black uppercase" dir="rtl">{store.nameAr}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-[10px] opacity-40 tracking-tighter">/{store.slug}</TableCell>
                {showOwner && (
                  <TableCell>
                    <Badge variant="outline" className="rounded-xl bg-white/5 text-[9px] border-white/10 font-black uppercase py-1">
                      {users.find(u => u.id === store.userId)?.name || '...'}
                    </Badge>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="outline" className={cn("rounded-xl font-black text-[9px] uppercase tracking-widest px-3 py-1", store.isActive ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-muted/20")}>
                    {store.isActive ? t('active') : t('inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right pe-8">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-all">
                      <Link href={getStoreUrl(store.slug)} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-3xl border-white/10 rounded-[1.5rem] shadow-2xl p-2 ring-1 ring-white/10">
                        <DropdownMenuItem 
                          onClick={() => { 
                            setSelectedStore(store); 
                            setFormData({ 
                              name: store.name,
                              nameAr: store.nameAr,
                              slug: store.slug,
                              whatsappNumber: store.whatsappNumber || '',
                              description: store.description,
                              descriptionAr: store.descriptionAr || '',
                              logoUrl: store.logoUrl || '',
                              coverUrl: store.coverUrl || '',
                              isActive: store.isActive,
                              globalDiscount: store.globalDiscount || 0,
                              deliveryDays: store.deliveryDays || 3,
                              telegramToken: store.telegramToken || '',
                              telegramChatId: store.telegramChatId || '',
                              themeSettings: store.themeSettings || {
                                primaryColor: '#2563eb',
                                accentColor: '#3b82f6',
                                backgroundColor: '#ffffff',
                                fontFamily: 'Inter',
                                themeName: 'Default'
                              },
                              notificationMethod: store.notificationSettings?.notificationMethod || 'telegram',
                              telegramUserId: store.telegramUserId || '',
                              telegramGroupId: store.telegramGroupId || ''
                            }); 
                            setStep(1); 
                            setIsEditDialogOpen(true); 
                          }} 
                          className="rounded-xl focus:bg-primary focus:text-primary-foreground font-black uppercase text-[10px] tracking-widest p-4 cursor-pointer gap-3"
                        >
                          <Edit className="h-4 w-4" /> {t('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-xl focus:bg-accent focus:text-accent-foreground font-black uppercase text-[10px] tracking-widest p-4 cursor-pointer gap-3">
                          <Link href={`/dashboard/products?store_id=${store.id}`}>
                            <Plus className="h-4 w-4" /> {t('add')} {t('product')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/5 my-1" />
                        <DropdownMenuItem onClick={() => handleDelete(store.id)} className="rounded-xl focus:bg-destructive focus:text-destructive-foreground text-destructive font-black uppercase text-[10px] tracking-widest p-4 cursor-pointer gap-3">
                          <Trash2 className="h-4 w-4" /> {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] sm:rounded-[3.5rem] ring-1 ring-white/10">
          <div className="flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="p-8 sm:p-10 pb-6 border-b border-white/5 bg-white/5">
              <DialogHeader>
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-3xl bg-accent/20 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                    <Palette className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">{t('edit')} {t('stores')}</DialogTitle>
                    <DialogDescription className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">{t('modifyStorefront' as any)}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <StoreFormFields 
                formData={formData} setFormData={setFormData}
                step={step} setStep={setStep}
                handleFileUpload={handleFileUpload} isUploading={isUploading}
                logoMode={logoMode} setLogoMode={setLogoMode}
                coverMode={coverMode} setCoverMode={setCoverMode}
                handleNameChange={handleNameChange}
                handleAdd={handleAdd} handleUpdate={handleUpdate}
                t={t} language={language}
                isEdit={true}
                storeId={selectedStore?.id}
                telegramUserId={formData.telegramUserId}
                telegramGroupId={formData.telegramGroupId}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Extracted Form Fields for Focus Stability
 */
interface StoreFormFieldsProps {
  formData: any
  setFormData: (data: any) => void
  step: number
  setStep: (step: number) => void
  handleFileUpload: any
  isUploading: any
  logoMode: string
  setLogoMode: (mode: 'url' | 'upload') => void
  coverMode: string
  setCoverMode: (mode: 'url' | 'upload') => void
  handleNameChange: (val: string) => void
  handleAdd: () => void
  handleUpdate: () => void
  t: any
  language: string
  isEdit?: boolean
  storeId?: string | number
  telegramUserId?: string
  telegramGroupId?: string
}

function StoreFormFields({
  formData, setFormData, step, setStep, handleFileUpload, isUploading,
  logoMode, setLogoMode, coverMode, setCoverMode, handleNameChange,
  handleAdd, handleUpdate, t, language, isEdit = false, storeId,
  telegramUserId, telegramGroupId
}: StoreFormFieldsProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async (type: 'user' | 'group') => {
    let activeStoreId = storeId
    
    // If it's a new store, we need to save it first
    if (!isEdit && !activeStoreId) {
      toast.info(t('savingStoreFirst' as any) || 'Saving store first...')
      try {
        const newStore = await handleAdd() as any
        if (newStore && newStore.id) {
          activeStoreId = newStore.id
          // Note: In a real app, we might need to wait for state to sync, 
          // but handleAdd in parent should have updated the store list.
        } else {
          return // Error already handled by handleAdd
        }
      } catch (err) {
        return
      }
    }

    if (!activeStoreId) {
      toast.error(t('saveStoreFirst' as any) || 'Please save the store first.')
      return
    }

    setIsConnecting(true)
    try {
      const res = await fetch('/api/telegram/link-bot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        },
        body: JSON.stringify({ storeId: activeStoreId, type })
      })
      const data = await res.json()
      if (data.success && data.deeplink) {
        window.location.href = data.deeplink
        toast.info(t('followInstructionsInTelegram' as any) || 'Please follow the instructions in Telegram')
      } else {
        toast.error(data.error || 'Failed to generate link')
      }
    } catch (error) {
      toast.error('Network error')
    } finally {
      setIsConnecting(false)
    }
  }
  
  const steps = [
    { id: 1, name: t('basics'), icon: Layout },
    { id: 2, name: t('appearance'), icon: Palette },
    { id: 3, name: t('connections'), icon: Settings2 },
  ]

  return (
    <div className="w-full">
      {/* 3-Step Wizard Progress */}
      <div className="flex items-center justify-between px-8 sm:px-16 py-8 border-b border-white/5 bg-white/5">
        {steps.map((s) => (
          <div key={s.id} className="flex-1 relative group">
            <div className="flex flex-col items-center gap-3 relative z-10">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl ring-2",
                  step >= s.id 
                    ? "bg-primary text-primary-foreground ring-primary/40 scale-110" 
                    : "bg-white/5 text-muted-foreground ring-transparent hover:bg-white/10"
                )}
              >
                <s.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] transition-all hidden sm:block",
                step >= s.id ? "text-primary opacity-100" : "text-muted-foreground opacity-40"
              )}>
                {s.name}
              </span>
            </div>
            {s.id < steps.length && (
              <div className="absolute top-5 sm:top-6 left-1/2 w-full h-[2px] bg-white/5 -z-0">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-primary to-accent transition-all duration-1000 ease-in-out" 
                  style={{ transform: `translateX(${step > s.id ? '0%' : '-100%'})` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-8 sm:p-12">
        <div className="min-h-[400px] sm:min-h-[450px]">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="p-10 rounded-[3rem] border border-white/5 bg-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0 duration-1000">
                  <StoreIcon className="h-40 w-40" />
                </div>
               <div className="flex flex-col sm:flex-row items-center gap-10 relative z-10">
                  <div className="relative group/logo-upload">
                    <div className="h-32 w-32 rounded-[2.5rem] bg-background border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shadow-2xl ring-1 ring-white/5 transition-all group-hover/logo-upload:border-primary/50 group-hover/logo-upload:ring-primary/20">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="" className="h-full w-full object-cover transition-transform group-hover/logo-upload:scale-110" />
                      ) : (
                        <div className="text-center p-4 opacity-20">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-primary group-hover/logo-upload:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-tighter">{t('clickToUploadLogo')}</span>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="step1-logo-upload"
                      onChange={(e) => handleFileUpload(e, 'logo', storeId)} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                    />
                    {isUploading.logo && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-[2.5rem] z-30">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 text-center sm:text-left flex-1 min-w-0">
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-2 opacity-60">{t('brandArchitect')}</p>
                      <h3 className="text-4xl font-black tracking-tighter leading-none truncate">{formData.name || t('yourVision')}</h3>
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
                        <Globe2 className="h-4 w-4 text-primary" />
                        <span className="opacity-60 truncate max-w-[150px]">storify.shop/{formData.slug || 'slug'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
                        <Truck className="h-4 w-4 text-accent" />
                        <span className="opacity-60">{formData.deliveryDays} {t('days')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('storeName')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="..."
                    className="h-14 rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all text-lg font-black tracking-tight"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('nameArabic')}</Label>
                  <Input
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    placeholder="..."
                    dir="rtl"
                    className="h-14 rounded-2xl bg-white/5 border-white/5 focus:bg-white/10 transition-all text-lg font-black tracking-tight"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('storeSlug')}</Label>
                  <div className="relative">
                    <Input
                      value={formData.slug}
                      disabled={isEdit}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="store-name"
                      className="h-14 rounded-2xl bg-white/5 border-white/5 pl-5 font-mono text-sm tracking-widest disabled:opacity-40"
                    />
                    {!isEdit && (
                       <div className="absolute right-5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse" />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ps-2 opacity-60">{t('deliveryWindow')}</Label>
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 5].map((d) => (
                      <Button
                        key={d}
                        variant={formData.deliveryDays === d ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, deliveryDays: d })}
                        className={cn(
                          "h-14 rounded-2xl font-black transition-all text-sm", 
                          formData.deliveryDays === d 
                            ? "bg-primary shadow-xl shadow-primary/20 scale-105" 
                            : "bg-white/5 border-white/5"
                        )}
                      >
                        {d}d
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: VISUALS */}
          {step === 2 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="aspect-[21/9] rounded-[3rem] bg-white/5 border border-white/5 relative overflow-hidden group shadow-2xl">
                {formData.coverUrl ? (
                  <img src={formData.coverUrl} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
                ) : (
                  <div className="inset-0 absolute flex items-center justify-center flex-col gap-3 opacity-10">
                    <Palette className="h-16 w-16" />
                    <p className="text-xs font-black uppercase tracking-[0.5em]">{t('sceneBlueprint')}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
                <div className="absolute bottom-10 left-10 flex items-center gap-8">
                  <div className="h-24 w-24 rounded-3xl bg-background border-4 border-white/5 overflow-hidden shadow-2xl ring-1 ring-white/10">
                    {formData.logoUrl && <img src={formData.logoUrl} className="h-full w-full object-cover" />}
                  </div>
                  <div className="text-foreground">
                    <p className="text-3xl font-black tracking-tighter mb-1">{formData.name || t('product')}</p>
                    <p className="text-[10px] opacity-40 font-black uppercase tracking-[0.3em]">{t('cinematicPreview')}</p>
                  </div>
                </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Logo Media */}
                  <div className="space-y-5 p-8 rounded-[3rem] bg-white/5 border border-white/5 relative group transition-all hover:bg-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20">
                          <StoreIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{t('coreLogo')}</span>
                      </div>
                      <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        <Button variant={logoMode === 'url' ? 'secondary' : 'ghost'} size="sm" className="h-8 text-[9px] px-4 font-black rounded-lg" onClick={() => setLogoMode('url')}>{t('addViaUrl')}</Button>
                        <Button variant={logoMode === 'upload' ? 'secondary' : 'ghost'} size="sm" className="h-8 text-[9px] px-4 font-black rounded-lg" onClick={() => setLogoMode('upload')}>{t('addPhoto')}</Button>
                      </div>
                    </div>
                    {logoMode === 'url' ? (
                      <Input value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} placeholder="https://media..." className="h-14 bg-background/50 rounded-2xl border-white/5" />
                    ) : (
                      <label htmlFor="logo-upload-input" className="relative h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center hover:border-primary/50 transition-all cursor-pointer group/upload bg-background/30 shadow-inner">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="logo-upload-input"
                          onChange={(e) => handleFileUpload(e, 'logo', storeId)} 
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        />
                        <div className="flex flex-col items-center gap-2 opacity-40 group-hover/upload:opacity-100 transition-opacity">
                          {isUploading.logo ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
                          <span className="text-[10px] font-black uppercase tracking-widest">{isUploading.logo ? t('deployingMedia') : t('selectStoreLogo')}</span>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Banner Media */}
                  <div className="space-y-5 p-8 rounded-[3rem] bg-white/5 border border-white/5 relative group transition-all hover:bg-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent/20">
                          <Palette className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-60">{t('heroBanner')}</span>
                      </div>
                      <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                        <Button variant={coverMode === 'url' ? 'secondary' : 'ghost'} size="sm" className="h-8 text-[9px] px-4 font-black rounded-lg" onClick={() => setCoverMode('url')}>{t('addViaUrl')}</Button>
                        <Button variant={coverMode === 'upload' ? 'secondary' : 'ghost'} size="sm" className="h-8 text-[9px] px-4 font-black rounded-lg" onClick={() => setCoverMode('upload')}>{t('addPhoto')}</Button>
                      </div>
                    </div>
                    {coverMode === 'url' ? (
                      <Input value={formData.coverUrl} onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })} placeholder="https://media..." className="h-14 bg-background/50 rounded-2xl border-white/5" />
                    ) : (
                      <label htmlFor="cover-upload-input" className="relative h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center hover:border-accent/50 transition-all cursor-pointer group/upload bg-background/30 shadow-inner">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="cover-upload-input"
                          onChange={(e) => handleFileUpload(e, 'cover', storeId)} 
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        />
                        <div className="flex flex-col items-center gap-2 opacity-40 group-hover/upload:opacity-100 transition-opacity">
                          {isUploading.cover ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <Upload className="h-6 w-6 text-accent" />}
                          <span className="text-[10px] font-black uppercase tracking-widest">{isUploading.cover ? t('deployingMedia') : t('selectCoverBanner')}</span>
                        </div>
                      </label>
                    )}
                  </div>
               </div>

               {/* Design Tokens */}
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {THEME_SUGGESTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        themeSettings: { 
                          ...formData.themeSettings, 
                          primaryColor: theme.colors.primary, 
                          accentColor: theme.colors.accent, 
                          backgroundColor: theme.colors.background, 
                          themeName: theme.id 
                        } 
                      })}
                      className={cn(
                        "group p-6 rounded-[2.5rem] border-2 transition-all duration-500 relative",
                        formData.themeSettings.themeName === theme.id 
                          ? "border-primary bg-primary/10 scale-105 shadow-2xl" 
                          : "border-white/5 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="h-12 w-12 rounded-[1.25rem] mx-auto mb-4 shadow-2xl transform group-hover:rotate-12 transition-transform" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})` }}>
                        {formData.themeSettings.themeName === theme.id && <CheckCircle2 className="h-full w-full p-3 text-white" />}
                      </div>
                      <p className="text-[9px] font-black uppercase text-center opacity-80 tracking-widest leading-tight">{language === 'ar' ? theme.nameAr : theme.name}</p>
                    </button>
                  ))}
               </div>
            </div>
          )}

          {/* STEP 3: INTEGRATIONS */}
          {step === 3 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
               <div className="p-10 rounded-[3.5rem] bg-white/5 border border-white/5 space-y-10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center shadow-inner ring-1 ring-white/10">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black uppercase tracking-tighter leading-none mb-1">{t('pulseEngine')}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">{t('chooseNotificationGateway')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
                    {[
                      { id: 'telegram', label: t('telegramBot'), icon: Globe2, color: 'text-primary' },
                      { id: 'whatsapp', label: t('whatsapp'), icon: MessageSquare, color: 'text-success' },
                      { id: 'both', label: t('omniChannel'), icon: Layout, color: 'text-accent' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setFormData({ ...formData, notificationMethod: m.id as any })}
                        className={cn(
                          "p-8 rounded-[3rem] border-2 text-left transition-all duration-500 group relative",
                          formData.notificationMethod === m.id 
                            ? "border-primary bg-primary/20 shadow-2xl scale-[1.02]" 
                            : "border-white/5 bg-background/50 hover:border-white/20"
                        )}
                      >
                        <m.icon className={cn("h-8 w-8 mb-6 group-hover:scale-125 transition-transform duration-700", m.color)} />
                        <p className="font-black uppercase tracking-tight text-lg leading-none mb-1">{m.label}</p>
                        <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">{t('active')}</p>
                      </button>
                    ))}
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-8">
                {(formData.notificationMethod === 'whatsapp' || formData.notificationMethod === 'both') && (
                  <div className="p-8 rounded-[3.5rem] bg-success/5 border border-success/10 space-y-4 animate-in zoom-in-95 duration-500">
                    <Label className="text-[10px] font-black uppercase text-success tracking-[0.3em] ps-2 opacity-60">{t('directWhatsappLink')}</Label>
                    <Input value={formData.whatsappNumber} onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} placeholder="+964 7XX XXX XXXX" dir="ltr" className="h-14 rounded-2xl bg-background/50 border-success/20 font-mono text-success text-xl" />
                  </div>
                )}
                {(formData.notificationMethod === 'telegram' || formData.notificationMethod === 'both') && (
                  <div className="p-10 rounded-[3.5rem] bg-primary/5 border border-primary/10 space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                          <Send className="h-6 w-6 text-primary" />
                       </div>
                       <div>
                          <p className="font-black uppercase tracking-tight">{t('telegramBot')}</p>
                          <p className="text-[10px] opacity-40 font-black uppercase tracking-widest">{t('oneClickConnect' as any) || 'One-Click Connect'}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Button 
                          variant="outline" 
                          className={cn("h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1", telegramUserId ? "border-success/20 bg-success/5" : "border-white/5")}
                          onClick={() => handleConnect('user')}
                          disabled={isConnecting}
                       >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-black uppercase text-[10px] tracking-widest">Private Bot</span>
                          </div>
                          {telegramUserId && <span className="text-[8px] text-success font-black uppercase">Connected</span>}
                       </Button>
                       <Button 
                          variant="outline" 
                          className={cn("h-16 rounded-2xl border-2 flex flex-col items-center justify-center gap-1", telegramGroupId ? "border-success/20 bg-success/5" : "border-white/5")}
                          onClick={() => handleConnect('group')}
                          disabled={isConnecting}
                       >
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-black uppercase text-[10px] tracking-widest">Group Bot</span>
                          </div>
                          {telegramGroupId && <span className="text-[8px] text-success font-black uppercase">Connected</span>}
                       </Button>
                    </div>
                  </div>
                )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-10 sm:p-14 pt-6 flex flex-col-reverse sm:flex-row justify-between gap-6 border-t border-white/5 bg-white/5">
        <Button 
          variant="ghost" 
          disabled={step === 1} 
          onClick={() => setStep(step === 1 ? 1 : step - 1)}
          className="w-full sm:w-auto rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-[0.3em] bg-white/5 hover:bg-white/10 transition-all border border-white/5"
        >
          {t('back')}
        </Button>
        
        {step < 3 ? (
          <Button 
            onClick={() => setStep(step >= 3 ? 3 : step + 1)}
            className="w-full sm:w-auto rounded-2xl h-14 px-14 font-black uppercase text-xs tracking-[0.3em] bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transform hover:scale-105 active:scale-95 transition-all"
          >
            {t('continue')}
          </Button>
        ) : (
          <Button 
            onClick={isEdit ? handleUpdate : handleAdd}
            className={cn(
              "w-full sm:w-auto rounded-2xl h-14 px-14 font-black uppercase text-xs tracking-[0.3em] shadow-2xl transition-all transform hover:scale-105 active:scale-95 gap-3",
              isEdit ? "bg-accent hover:bg-accent/90 shadow-accent/40" : "bg-success hover:bg-success/90 shadow-success/40"
            )}
          >
            <Save className="h-5 w-5" />
            {isEdit ? t('save') : t('add')}
          </Button>
        )}
      </div>
    </div>
  )
}
