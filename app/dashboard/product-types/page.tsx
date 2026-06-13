'use client'

import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Layers, FolderTree, Globe, Search } from 'lucide-react'
import type { ProductType, Category } from '@/lib/types'
import { DashboardPageHeader } from '@/components/dashboard/page-header'
import { toast } from 'sonner'

export default function CategoriesPage() {
  const { user, language } = useAuth()
  const {
    stores,
    productTypes: categoryGroups,
    categories: subCategories,
    addProductType: addCategoryGroup,
    updateProductType: updateCategoryGroup,
    deleteProductType: deleteCategoryGroup,
    addCategory: addSubCategory,
    updateCategory: updateSubCategory,
    deleteCategory: deleteSubCategory,
    selectedStoreId
  } = useData()

  const isRtl = language === 'ar' || language === 'ku'
  const isEmployee = user?.role === 'employee'
  const userStores = useMemo(
    () => {
      if (user?.role === 'admin' || user?.role === 'employee') {
        return stores
      }

      return stores.filter(store => store.userId === user?.id)
    },
    [stores, user?.id, user?.role]
  )
  const userStoreIds = useMemo(() => userStores.map(s => s.id), [userStores])
  const singleUserStoreId = userStoreIds.length === 1 ? userStoreIds[0] : ''
  const [searchQuery, setSearchQuery] = useState('')

  const filteredGroups = useMemo(() => {
    const selectedGroups = selectedStoreId
      ? categoryGroups.filter(pt => pt.storeId === selectedStoreId || !pt.storeId || pt.storeId === 'null')
      : categoryGroups

    const roleScopedGroups = user?.role === 'admin'
      ? selectedGroups
      : selectedGroups.filter(pt => !pt.storeId || pt.storeId === 'null' || userStoreIds.includes(pt.storeId))

    const query = searchQuery.trim().toLowerCase()
    if (!query) return roleScopedGroups

    return roleScopedGroups.filter(group => {
      const storeName = stores.find(store => store.id === group.storeId)?.name || ''
      const childNames = subCategories
        .filter(category => category.productTypeId === group.id)
        .map(category => `${category.name} ${category.slug}`)
        .join(' ')
      const searchable = `${group.name} ${group.slug || ''} ${storeName} ${childNames}`.toLowerCase()
      return searchable.includes(query)
    })
  }, [categoryGroups, searchQuery, selectedStoreId, stores, subCategories, user?.role, userStoreIds])

  const [selectedGroup, setSelectedGroup] = useState<ProductType | null>(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState<Category | null>(null)
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false)

  // Form state for new category group
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupStoreId, setNewGroupStoreId] = useState(selectedStoreId || '')

  // Sync with global selection
  useEffect(() => {
    if (selectedStoreId) {
      setNewGroupStoreId(selectedStoreId)
    } else if (singleUserStoreId) {
      setNewGroupStoreId(singleUserStoreId)
    }
  }, [selectedStoreId, singleUserStoreId])

  // Form state for new sub-category
  const [newSubName, setNewSubName] = useState('')
  const [newSubSlug, setNewSubSlug] = useState('')
  const [newSubParentId, setNewSubParentId] = useState<string | null>(null)

  const getChildSubCategories = (parentId: string | null, groupId: string): Category[] => {
    return subCategories.filter(c => c.parentId === parentId && c.productTypeId === groupId)
  }

  const renderSubCategoryTree = (parentId: string | null, groupId: string, depth: number = 0, canManage: boolean = false): React.ReactNode => {
    const children = getChildSubCategories(parentId, groupId)
    if (children.length === 0) return null

    return children.map(sub => (
      <div key={sub.id} className="group/sub relative">
        {depth > 0 && (
          <div
            className="absolute -left-4 top-0 bottom-0 w-[1px] bg-primary/10"
            style={{ left: isRtl ? 'auto' : '-1rem', right: isRtl ? '-1rem' : 'auto' }}
          />
        )}
        <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/5 transition-all group/row border border-transparent hover:border-primary/5 mt-1 ms-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/20 group-hover/row:scale-150 group-hover/row:bg-primary transition-all shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
            <span className="font-bold text-sm tracking-tight">{sub.name}</span>
            <Badge variant="outline" className="text-[9px] border-white/5 bg-background/30 h-5 px-1.5 font-mono opacity-40 rounded-md">
              {sub.slug}
            </Badge>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-all scale-90 group-hover/row:scale-100">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-background/50 shadow-sm" onClick={() => {
                setSelectedGroup(categoryGroups.find(g => g.id === groupId) || null)
                setSelectedSubCategory(null)
                setNewSubParentId(sub.id)
                setNewSubName('')
                setNewSubSlug('')
                setIsSubDialogOpen(true)
              }}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-background/50 shadow-sm" onClick={() => {
                setSelectedGroup(categoryGroups.find(g => g.id === groupId) || null)
                setSelectedSubCategory(sub)
                setNewSubParentId(sub.parentId)
                setNewSubName(sub.name)
                setNewSubSlug(sub.slug || '')
                setIsSubDialogOpen(true)
              }}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
              {!isEmployee && (
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-background/50 shadow-sm hover:text-destructive" onClick={() => deleteSubCategory(sub.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
        <div className={isRtl ? 'me-4' : 'ms-4'}>
          {renderSubCategoryTree(sub.id, groupId, depth + 1, canManage)}
        </div>
      </div>
    ))
  }

  return (
    <div className="space-y-8 pb-20" dir={isRtl ? 'rtl' : 'ltr'}>
      <DashboardPageHeader
        eyebrow={isRtl ? 'إدارة المنتجات' : 'Product management'}
        title={isRtl ? 'الفئات' : 'Product sections'}
        description={isRtl ? 'نظم منتجاتك في هيكل فئات واضح وقابل للإدارة' : 'Organize catalog sections and sub-categories with clear store scope and safe employee permissions.'}
        actions={(
          <Button
            onClick={() => {
              setSelectedGroup(null)
              setNewGroupName('')
              setNewGroupStoreId(selectedStoreId || singleUserStoreId || '')
              setIsGroupDialogOpen(true)
            }}
            className="h-11 rounded-xl px-5 font-semibold"
          >
            <Plus className="h-4 w-4" />
            {isRtl ? 'إضافة فئة رئيسية' : 'New section'}
          </Button>
        )}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={isRtl ? 'ابحث في الفئات' : 'Search sections and sub-categories'}
            className="h-11 rounded-xl bg-background ps-10"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
          <span className="rounded-md border border-border bg-muted/30 px-2.5 py-1">{filteredGroups.length} {isRtl ? 'قسم' : 'sections'}</span>
          <span className="rounded-md border border-border bg-muted/30 px-2.5 py-1">{subCategories.length} {isRtl ? 'فئة فرعية' : 'sub-categories'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {filteredGroups.map(group => {
          const groupStoreId = group.storeId || ''
          const isGlobalGroup = !groupStoreId || groupStoreId === 'null'
          const canManageGroup = user?.role === 'admin' || (!isGlobalGroup && userStoreIds.includes(groupStoreId))

          return (
          <Card key={group.id} className="group overflow-hidden border-border bg-card shadow-sm transition-colors hover:border-primary/20">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderTree className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold tracking-tight">{group.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-background/50 border-white/5 font-mono text-[10px] uppercase tracking-tighter">
                          {group.slug}
                        </Badge>
                        {isGlobalGroup ? (
                          <Badge className="bg-primary/10 text-primary border-none flex items-center gap-1 h-5 text-[9px] font-black uppercase tracking-widest">
                            <Globe className="h-2.5 w-2.5" />
                            {isRtl ? 'عام' : 'Global'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 text-[9px] font-black uppercase tracking-widest opacity-60">
                            {stores.find(s => s.id === group.storeId)?.name}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </div>

                {canManageGroup && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => {
                      setSelectedGroup(group)
                      setNewGroupName(group.name)
                      setNewGroupStoreId(group.storeId || '')
                      setIsGroupDialogOpen(true)
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!isEmployee && (
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteCategoryGroup(group.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <div className="min-h-[150px] rounded-xl border border-border bg-muted/15 p-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-semibold text-muted-foreground ps-1">
                    {isRtl ? 'الهيكل الهرمي' : 'Hierarchy Structure'}
                  </h3>
                  {canManageGroup && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-4"
                      onClick={() => {
                        setSelectedGroup(group)
                        setSelectedSubCategory(null)
                        setNewSubName('')
                        setNewSubSlug('')
                        setNewSubParentId(null)
                        setIsSubDialogOpen(true)
                      }}
                    >
                      <Plus className="h-3 w-3 me-2" />
                      {isRtl ? 'إضافة فئة' : 'Add Sub'}
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  {getChildSubCategories(null, group.id).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 opacity-10 grayscale">
                      <FolderTree className="h-12 w-12 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        {isRtl ? 'لا يوجد بيانات' : 'Empty Tree'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {subCategories
                        .filter(c => c.parentId === null && c.productTypeId === group.id)
                        .map(sub => (
                          <div key={sub.id} className="group/sub">
                            <div className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-primary/5 transition-all group/row border border-transparent hover:border-primary/10">
                              <div className="flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-primary/20 group-hover/row:scale-150 group-hover/row:bg-primary transition-all shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                                <span className="font-bold text-base tracking-tight">{sub.name}</span>
                                <Badge variant="outline" className="text-[9px] border-white/5 bg-background/30 h-5 px-1.5 font-mono opacity-40 rounded-md">
                                  {sub.slug}
                                </Badge>
                              </div>
                              {canManageGroup && (
                                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-all scale-90 group-hover/row:scale-100">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-background/50 shadow-sm" onClick={() => {
                                    setSelectedGroup(group)
                                    setSelectedSubCategory(null)
                                    setNewSubParentId(sub.id)
                                    setNewSubName('')
                                    setNewSubSlug('')
                                    setIsSubDialogOpen(true)
                                  }}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-background/50 shadow-sm" onClick={() => {
                                    setSelectedGroup(group)
                                    setSelectedSubCategory(sub)
                                    setNewSubParentId(sub.parentId)
                                    setNewSubName(sub.name)
                                    setNewSubSlug(sub.slug || '')
                                    setIsSubDialogOpen(true)
                                  }}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {!isEmployee && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-background/50 shadow-sm hover:text-destructive" onClick={() => deleteSubCategory(sub.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className={isRtl ? 'me-4' : 'ms-4'}>
                              {renderSubCategoryTree(sub.id, group.id, 1, canManageGroup)}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          )
        })}
        {filteredGroups.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center xl:col-span-2">
            <FolderTree className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{isRtl ? 'لا توجد فئات مطابقة' : 'No matching sections'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isRtl ? 'غيّر البحث أو أضف فئة جديدة لهذا المتجر' : 'Adjust the search or create a new section for this store.'}
            </p>
          </div>
        )}
      </div>

      {/* Main Category Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-white/10 bg-background/95 backdrop-blur-3xl">
          <div className="h-32 bg-gradient-to-br from-primary/30 to-primary/5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="absolute -bottom-8 left-10 p-5 rounded-[2rem] bg-background shadow-2xl border border-white/10">
              <Layers className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="px-10 pt-12 pb-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-4xl font-black tracking-tighter">
                {selectedGroup ? (isRtl ? 'تعديل الفئة' : 'Edit Category') : (isRtl ? 'إضافة فئة جديدة' : 'Add New Category')}
              </DialogTitle>
              <DialogDescription className="text-base font-medium opacity-60">
                {isRtl ? 'أدخل اسم الفئة لتنظيم منتجاتك بشكل أفضل' : 'Enter a name for your category to better organize your catalog'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 ms-2">
                  {isRtl ? 'اسم الفئة' : 'Category Name'}
                </Label>
                <Input
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder={isRtl ? 'مثال: إلكترونيات' : "e.g., Electronics"}
                  className="h-16 text-2xl font-black rounded-2xl bg-muted/20 border-white/5 focus:ring-primary/30 transition-all placeholder:opacity-20 ps-6"
                  autoFocus
                />
              </div>

              {!selectedStoreId && (user?.role === 'admin' || userStores.length > 1) && (
                <div className="space-y-4 p-6 rounded-[2rem] bg-primary/5 border border-primary/10">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" />
                    {isRtl ? 'المتجر المستهدف' : 'Target Store'}
                  </Label>
                  <Select value={newGroupStoreId} onValueChange={setNewGroupStoreId}>
                    <SelectTrigger className="rounded-xl h-12 bg-background border-white/5 font-bold shadow-sm">
                      <SelectValue placeholder={isRtl ? 'اختر المتجر' : 'Select store'} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-white/10">
                      {user?.role === 'admin' && (
                        <SelectItem value="null" className="font-bold text-primary">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" />
                            {isRtl ? 'عام (للجميع)' : 'Global (All Stores)'}
                          </div>
                        </SelectItem>
                      )}
                      {userStores.map(store => (
                        <SelectItem key={store.id} value={store.id} className="font-medium">
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="gap-3 sm:gap-0 mt-10 pt-8 border-t border-white/5">
              <Button
                variant="ghost"
                className="rounded-2xl h-14 px-8 font-bold text-muted-foreground hover:bg-muted/30"
                onClick={() => {
                  setIsGroupDialogOpen(false)
                  setSelectedGroup(null)
                  setNewGroupName('')
                }}
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                className="rounded-2xl h-14 px-10 font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 text-lg"
                onClick={async () => {
                  try {
                    const groupData: Omit<ProductType, 'id' | 'createdAt'> = {
                      storeId: selectedStoreId || (newGroupStoreId === 'null' ? null : newGroupStoreId),
                      name: newGroupName,
                      slug: newGroupName.toLowerCase().replace(/\s+/g, '-'),
                      description: '',
                      customFields: [],
                      isActive: true
                    }

                    if (selectedGroup) {
                      await updateCategoryGroup(selectedGroup.id, groupData)
                    } else {
                      await addCategoryGroup(groupData)
                    }

                    setIsGroupDialogOpen(false)
                    setSelectedGroup(null)
                    setNewGroupName('')
                  } catch {
                    toast.error(isRtl ? 'تعذر حفظ الفئة' : 'Could not save section')
                  }
                }}
                disabled={!newGroupName || (!selectedStoreId && !newGroupStoreId)}
              >
                {isRtl ? 'حفظ الفئة' : 'Save Category'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Category Dialog */}
      <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[3rem] border-white/10 p-10 bg-background/95 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.3)]">
          <DialogHeader className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-3xl bg-primary/10 text-primary shadow-inner">
                <FolderTree className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black tracking-tight">
                  {selectedSubCategory ? (isRtl ? 'تعديل فئة فرعية' : 'Edit Sub-Category') : (isRtl ? 'فئة فرعية جديدة' : 'New Sub-Category')}
                </DialogTitle>
                <DialogDescription className="text-base font-medium">
                  {isRtl ? 'إضافة فئة تحت' : 'Adding to'} <span className="text-primary font-black">"{selectedGroup?.name}"</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8 py-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ms-2">
                {isRtl ? 'اسم الفئة الفرعية' : 'Sub-Category Name'}
              </Label>
              <Input
                value={newSubName}
                onChange={e => {
                  setNewSubName(e.target.value)
                  setNewSubSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                }}
                placeholder={isRtl ? 'مثال: سماعات' : "e.g., Headphones"}
                className="h-16 text-2xl font-black rounded-2xl bg-muted/20 border-white/5 focus:ring-primary/30 transition-all placeholder:opacity-20 ps-6"
                autoFocus
              />
            </div>

            <div className="p-6 rounded-3xl bg-muted/20 border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                <span>{isRtl ? 'المعرف الفريد' : 'Slug / ID'}</span>
                <span>{isRtl ? 'تلقائي' : 'Auto-generated'}</span>
              </div>
              <div className="font-mono text-sm text-primary font-bold bg-primary/5 p-2 rounded-lg inline-block border border-primary/10">
                /{newSubSlug || '...'}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" className="rounded-2xl h-12 font-bold px-6" onClick={() => setIsSubDialogOpen(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              className="rounded-2xl h-12 px-10 font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90"
              onClick={() => {
                if (!selectedGroup) return
                if (selectedSubCategory) {
                  updateSubCategory(selectedSubCategory.id, {
                    parentId: newSubParentId,
                    name: newSubName,
                    slug: newSubSlug,
                  })
                } else {
                  addSubCategory({
                    storeId: selectedGroup.storeId,
                    productTypeId: selectedGroup.id,
                    parentId: newSubParentId,
                    name: newSubName,
                    slug: newSubSlug,
                    isActive: true,
                    sortOrder: 0
                  })
                }
                setIsSubDialogOpen(false)
                setSelectedSubCategory(null)
                setNewSubName('')
                setNewSubSlug('')
                setNewSubParentId(null)
              }}
              disabled={!newSubName}
            >
              {selectedSubCategory ? (isRtl ? 'حفظ' : 'Save') : (isRtl ? 'إضافة الآن' : 'Add Now')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
