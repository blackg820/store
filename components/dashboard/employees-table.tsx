'use client'

import { useState } from 'react'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import type { User } from '@/lib/types'
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
import { Switch } from '@/components/ui/switch'
import { MoreHorizontal, Search, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function EmployeesTable() {
  const { t } = useTranslations()
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    isDataLoading,
  } = useData()

  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    status: 'active' as 'active' | 'inactive',
  })
  const [isSaving, setIsSaving] = useState(false)

  let filteredEmployees = employees

  if (searchQuery) {
    filteredEmployees = filteredEmployees.filter(u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      status: 'active',
    })
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.email || !formData.password) return

    setIsSaving(true)
    const success = await addEmployee({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    })

    if (success) {
      setIsAddDialogOpen(false)
      resetForm()
    }
    setIsSaving(false)
  }

  const handleEdit = (employee: User) => {
    setSelectedEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '', // Keep empty when editing
      status: employee.isActive ? 'active' : 'inactive',
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (selectedEmployee) {
      setIsSaving(true)
      await updateEmployee(selectedEmployee.id, {
        name: formData.name,
        email: formData.email,
        status: formData.status,
        ...(formData.password ? { password: formData.password } : {})
      })
      setIsEditDialogOpen(false)
      resetForm()
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm(t('areYouSure'))) {
      await deleteEmployee(id)
    }
  }

  const handleToggleStatus = async (employee: User) => {
    await updateEmployee(employee.id, {
      status: employee.isActive ? 'inactive' : 'active'
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between glass-card p-4 rounded-2xl border-white/10 shadow-lg">
        <div className="relative w-full sm:w-72 group">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl transition-all h-11"
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 me-2" />
              {t('addEmployee')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addEmployee')}</DialogTitle>
              <DialogDescription>
                {t('addEmployeeDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleAdd} disabled={isSaving}>
                {isSaving ? t('creating') : t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl glass-card border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader className="bg-background/95 backdrop-blur-sm border-b border-white/10 shadow-sm">
             <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest py-4 ps-6">{t('name')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('email')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">{t('status')}</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest text-end pe-6">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDataLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent border-b border-border/50">
                  <TableCell className="ps-6"><Skeleton className="w-32 h-5 rounded-lg" /></TableCell>
                  <TableCell><Skeleton className="w-48 h-5 rounded-lg opacity-50" /></TableCell>
                  <TableCell><Skeleton className="w-16 h-6 rounded-full opacity-50" /></TableCell>
                  <TableCell className="text-end pe-6"><Skeleton className="w-8 h-8 rounded-lg ms-auto opacity-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {t('noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <p className="font-medium">{employee.name}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{employee.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                      {employee.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem onClick={() => handleEdit(employee)}>
                          <Edit className="h-4 w-4 me-2" />
                          {t('edit')}
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => handleToggleStatus(employee)}>
                          {employee.isActive ? (
                            <>
                              <UserX className="h-4 w-4 me-2" />
                              {t('deactivate')}
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 me-2" />
                              {t('activate')}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(employee.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 me-2" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editEmployee')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">{t('name')}</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">{t('email')}</Label>
              <Input
                id="editEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editPassword">{t('password')} ({t('optional')})</Label>
              <Input
                id="editPassword"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('leaveBlankToKeep')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="editStatus"
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'active' : 'inactive' })}
              />
              <Label htmlFor="editStatus">{t('active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
