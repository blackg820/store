'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Plus, Edit, Trash2, ChevronRight, Layers, FolderTree, Globe } from 'lucide-react'
import type { ProductType, CustomFieldDefinition, CustomFieldType, Category } from '@/lib/types'

export default function ProductTypesPage() {
  const { user, language } = useAuth()
  const { t } = useTranslations()
  const { stores, productTypes, categories, getStoresByUserId, addProductType, updateProductType, addCategory, selectedStoreId } = useData()
  const isRtl = language === 'ar' || language === 'ku'

  const userStores = user?.role === 'admin' ? stores : getStoresByUserId(user?.id || '')
  
  let filteredTypes = selectedStoreId 
    ? productTypes.filter(pt => pt.storeId === selectedStoreId || !pt.storeId || pt.storeId === 'null')
    : productTypes

  if (user?.role !== 'admin') {
    const userStoreIds = userStores.map(s => s.id)
    filteredTypes = filteredTypes.filter(pt => !pt.storeId || pt.storeId === 'null' || userStoreIds.includes(pt.storeId))
  }

  const [selectedType, setSelectedType] = useState<ProductType | null>(null)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)

  // Form state for new product type
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeNameAr, setNewTypeNameAr] = useState('')
  const [newTypeStoreId, setNewTypeStoreId] = useState('')
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])

  // Form state for new category
  const [newCatName, setNewCatName] = useState('')
  const [newCatNameAr, setNewCatNameAr] = useState('')
  const [newCatSlug, setNewCatSlug] = useState('')
  const [newCatParentId, setNewCatParentId] = useState<string | null>(null)

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: `cf-${Date.now()}`,
        name: '',
        nameAr: '',
        type: 'text' as CustomFieldType,
        required: false,
      },
    ])
  }

  const updateCustomField = (index: number, field: Partial<CustomFieldDefinition>) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], ...field }
    setCustomFields(updated)
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const getChildCategories = (parentId: string | null, typeId: string): Category[] => {
    return categories.filter(c => c.parentId === parentId && c.productTypeId === typeId)
  }

  const renderCategoryTree = (parentId: string | null, typeId: string, depth: number = 0): React.ReactNode => {
    const children = getChildCategories(parentId, typeId)
    if (children.length === 0) return null

    return children.map(cat => (
      <div key={cat.id} style={{ marginLeft: depth * 20 }}>
        <div className="flex items-center gap-2 py-1">
          {depth > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className={cat.isActive ? '' : 'text-muted-foreground line-through'}>
            {isRtl ? cat.nameAr : cat.name}
          </span>
          <Badge variant="outline" className="text-xs">{cat.slug}</Badge>
        </div>
        {renderCategoryTree(cat.id, typeId, depth + 1)}
      </div>
    ))
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isRtl ? 'أنواع المنتجات والفئات' : 'Product Types & Categories'}
          </h1>
          <p className="text-muted-foreground">
            {isRtl ? 'إدارة أنواع المنتجات الديناميكية وشجرة الفئات' : 'Manage dynamic product types and category trees'}
          </p>
        </div>
        <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {isRtl ? 'نوع جديد' : 'New Type'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedType ? (isRtl ? 'تعديل نوع المنتج' : 'Edit Product Type') : (isRtl ? 'إضافة نوع منتج جديد' : 'Add New Product Type')}</DialogTitle>
              <DialogDescription>
                {isRtl ? 'حدد الحقول المخصصة لهذا النوع من المنتجات' : 'Define custom fields for this product type'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRtl ? 'اسم النوع (إنجليزي)' : 'Type Name (English)'}</Label>
                  <Input
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    placeholder="e.g., Electronics"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRtl ? 'اسم النوع (عربي)' : 'Type Name (Arabic)'}</Label>
                  <Input
                    value={newTypeNameAr}
                    onChange={e => setNewTypeNameAr(e.target.value)}
                    placeholder="مثال: إلكترونيات"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? 'المتجر' : 'Store'}</Label>
                <Select value={newTypeStoreId} onValueChange={setNewTypeStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isRtl ? 'اختر المتجر' : 'Select store'} />
                  </SelectTrigger>
                  <SelectContent>
                    {user?.role === 'admin' && (
                      <SelectItem value="null">
                        <span className="flex items-center gap-2 font-bold text-primary">
                          <Globe className="h-3 w-3" />
                          {isRtl ? 'عام (للجميع)' : 'Global (All Stores)'}
                        </span>
                      </SelectItem>
                    )}
                    {userStores.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {isRtl ? store.nameAr : store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    {isRtl ? 'الحقول المخصصة' : 'Custom Fields'}
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                    <Plus className="h-4 w-4 me-1" />
                    {isRtl ? 'إضافة حقل' : 'Add Field'}
                  </Button>
                </div>

                {customFields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{isRtl ? 'اسم الحقل (إنجليزي)' : 'Field Name (EN)'}</Label>
                          <Input
                            value={field.name}
                            onChange={e => updateCustomField(index, { name: e.target.value })}
                            placeholder="e.g., Brand"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{isRtl ? 'اسم الحقل (عربي)' : 'Field Name (AR)'}</Label>
                          <Input
                            value={field.nameAr}
                            onChange={e => updateCustomField(index, { nameAr: e.target.value })}
                            placeholder="مثال: العلامة التجارية"
                            dir="rtl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{isRtl ? 'نوع الحقل' : 'Field Type'}</Label>
                          <Select
                            value={field.type}
                            onValueChange={(v: CustomFieldType) => updateCustomField(index, { type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">{isRtl ? 'نص' : 'Text'}</SelectItem>
                              <SelectItem value="number">{isRtl ? 'رقم' : 'Number'}</SelectItem>
                              <SelectItem value="select">{isRtl ? 'قائمة' : 'Select'}</SelectItem>
                              <SelectItem value="multi-select">{isRtl ? 'قائمة متعددة' : 'Multi-Select'}</SelectItem>
                              <SelectItem value="boolean">{isRtl ? 'نعم/لا' : 'Boolean'}</SelectItem>
                              <SelectItem value="date">{isRtl ? 'تاريخ' : 'Date'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={checked => updateCustomField(index, { required: checked })}
                            />
                            <Label>{isRtl ? 'مطلوب' : 'Required'}</Label>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCustomField(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {(field.type === 'select' || field.type === 'multi-select') && (
                        <div className="mt-4 space-y-2">
                          <Label>{isRtl ? 'الخيارات (مفصولة بفواصل)' : 'Options (comma separated)'}</Label>
                          <Input
                            value={field.options?.join(', ') || ''}
                            onChange={e => updateCustomField(index, {
                              options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                            placeholder="e.g., Small, Medium, Large"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsTypeDialogOpen(false)
                setSelectedType(null)
                setNewTypeName('')
                setNewTypeNameAr('')
                setCustomFields([])
              }}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={() => {
                const typeData = {
                  storeId: newTypeStoreId,
                  name: newTypeName,
                  nameAr: newTypeNameAr,
                  slug: newTypeName.toLowerCase().replace(/\s+/g, '-'),
                  description: '',
                  customFields: customFields,
                  isActive: true
                }
                if (selectedType) {
                  updateProductType(selectedType.id, typeData)
                } else {
                  addProductType({
                    ...typeData,
                    storeId: typeData.storeId === 'null' ? null : typeData.storeId
                  } as any)
                }
                setIsTypeDialogOpen(false)
                setSelectedType(null)
                setNewTypeName('')
                setNewTypeNameAr('')
                setCustomFields([])
              }} disabled={!newTypeStoreId || !newTypeName}>
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredTypes.map(type => {
          const store = userStores.find(s => s.id === type.storeId)
          const typeCategories = categories.filter(c => c.productTypeId === type.id)

          return (
            <Card key={type.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    {isRtl ? type.nameAr : type.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={type.isActive ? 'default' : 'secondary'}>
                    {type.isActive ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setSelectedType(type)
                      setNewTypeName(type.name)
                      setNewTypeNameAr(type.nameAr)
                      setNewTypeStoreId(type.storeId)
                      setCustomFields(type.customFields || [])
                      setIsTypeDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm font-medium flex items-center gap-2">
                  <span className="opacity-60">{isRtl ? 'المتجر:' : 'Store:'}</span>
                  {(!type.storeId || type.storeId === 'null' || type.storeId === 'undefined') ? (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1">
                      <Globe className="h-3 w-3" />
                      {isRtl ? 'عام' : 'Global'}
                    </Badge>
                  ) : (
                    <span className="font-bold">{isRtl ? store?.nameAr : store?.name}</span>
                  )}
                </div>

                <div>
                  <div className="font-medium mb-2">
                    {isRtl ? 'الحقول المخصصة' : 'Custom Fields'} ({(type.customFields || []).length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(type.customFields || []).map(field => (
                      <Badge key={field.id} variant="outline">
                        {isRtl ? field.nameAr : field.name}
                        <span className="ms-1 text-muted-foreground">({field.type})</span>
                        {field.required && <span className="ms-1 text-destructive">*</span>}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-medium">
                      <FolderTree className="h-4 w-4" />
                      {isRtl ? 'الفئات' : 'Categories'} ({typeCategories.length})
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedType(type)
                        setIsCategoryDialogOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="border rounded-md p-3 bg-muted/30">
                    {typeCategories.length > 0 ? (
                      renderCategoryTree(null, type.id)
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        {isRtl ? 'لا توجد فئات' : 'No categories yet'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTypes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {isRtl ? 'لا توجد أنواع منتجات' : 'No Product Types'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {isRtl
                ? 'أنشئ أنواع منتجات مع حقول مخصصة لتنظيم منتجاتك'
                : 'Create product types with custom fields to organize your products'}
            </p>
            <Button onClick={() => setIsTypeDialogOpen(true)}>
              <Plus className="h-4 w-4 me-2" />
              {isRtl ? 'إنشاء نوع منتج' : 'Create Product Type'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRtl ? 'إضافة فئة جديدة' : 'Add New Category'}
            </DialogTitle>
            <DialogDescription>
              {isRtl
                ? `إضافة فئة إلى ${selectedType?.nameAr}`
                : `Add category to ${selectedType?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRtl ? 'اسم الفئة (إنجليزي)' : 'Category Name (EN)'}</Label>
                <Input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g., Headphones"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? 'اسم الفئة (عربي)' : 'Category Name (AR)'}</Label>
                <Input
                  value={newCatNameAr}
                  onChange={e => setNewCatNameAr(e.target.value)}
                  placeholder="مثال: سماعات"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRtl ? 'الرابط' : 'Slug'}</Label>
              <Input
                value={newCatSlug}
                onChange={e => setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g., headphones"
              />
            </div>
            <div className="space-y-2">
              <Label>{isRtl ? 'الفئة الأم (اختياري)' : 'Parent Category (optional)'}</Label>
              <Select
                value={newCatParentId || 'none'}
                onValueChange={v => setNewCatParentId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRtl ? 'بدون فئة أم' : 'No parent'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRtl ? 'بدون فئة أم' : 'No parent (root)'}</SelectItem>
                  {categories
                    .filter(c => c.productTypeId === selectedType?.id)
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {isRtl ? cat.nameAr : cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => {
              if (selectedType) {
                addCategory({
                  storeId: selectedType.storeId,
                  productTypeId: selectedType.id,
                  parentId: newCatParentId,
                  name: newCatName,
                  nameAr: newCatNameAr,
                  slug: newCatSlug,
                  isActive: true,
                  sortOrder: 0
                })
              }
              setIsCategoryDialogOpen(false)
            }} disabled={!newCatName || !newCatSlug}>
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
