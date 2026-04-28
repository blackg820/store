'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { DashboardHeader } from '@/components/dashboard/header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { generateApiKey } from '@/lib/password'

interface LocalApiKey {
  id: string
  name: string
  keyPrefix: string
  fullKey: string // Only shown once on creation
  createdAt: string
  lastUsedAt?: string
  isActive: boolean
}

export default function ApiKeysPage() {
  const { user, language } = useAuth()
  const [keys, setKeys] = useState<LocalApiKey[]>([])
  const [createDialog, setCreateDialog] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const handleCreate = () => {
    if (!keyName.trim()) {
      toast.error(language === 'ar' ? 'الاسم مطلوب' : 'Name is required')
      return
    }
    const rawKey = generateApiKey()
    const key: LocalApiKey = {
      id: `key-${Date.now()}`,
      name: keyName,
      keyPrefix: rawKey.substring(0, 12),
      fullKey: rawKey,
      createdAt: new Date().toISOString(),
      isActive: true,
    }
    setKeys((prev) => [...prev, key])
    setNewKey(rawKey)
    setKeyName('')
    toast.success(language === 'ar' ? 'تم إنشاء المفتاح' : 'Key created')
  }

  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id))
    toast.success(language === 'ar' ? 'تم إلغاء المفتاح' : 'Key revoked')
  }

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
    toast.success(language === 'ar' ? 'تم النسخ' : 'Copied')
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader title={language === 'ar' ? 'مفاتيح API' : 'API Keys'} />

      <div className="p-4 md:p-6 space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {language === 'ar' ? 'تحذير أمني' : 'Security Notice'}
          </AlertTitle>
          <AlertDescription>
            {language === 'ar'
              ? 'احتفظ بمفاتيح API في مكان آمن. لا تشاركها في أكواد عامة أو رسائل عامة. سيتم عرض المفتاح الكامل مرة واحدة فقط.'
              : 'Keep API keys secure. Do not share them in public code or messages. The full key is shown only once at creation.'}
          </AlertDescription>
        </Alert>

        {newKey && (
          <Alert className="border-accent bg-accent/10">
            <Key className="h-4 w-4" />
            <AlertTitle>
              {language === 'ar' ? 'تم إنشاء مفتاح جديد' : 'New Key Created'}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                {language === 'ar'
                  ? 'انسخ هذا المفتاح الآن. لن تتمكن من رؤيته مرة أخرى.'
                  : 'Copy this key now. You will not be able to see it again.'}
              </p>
              <div className="flex items-center gap-2 p-2 rounded-md bg-background font-mono text-sm">
                <code className="flex-1 break-all">{newKey}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(newKey, 'new')}
                >
                  {copied === 'new' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={() => setNewKey(null)}>
                {language === 'ar' ? 'لقد نسخته' : "I've copied it"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {language === 'ar' ? 'مفاتيح API الخاصة بك' : 'Your API Keys'}
              </CardTitle>
              <CardDescription>
                {language === 'ar'
                  ? 'استخدم هذه المفاتيح للوصول إلى API الخاص بتطبيقات الجوال'
                  : 'Use these keys to access the API from mobile apps'}
              </CardDescription>
            </div>
            <Dialog open={createDialog} onOpenChange={setCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'مفتاح جديد' : 'New Key'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {language === 'ar' ? 'إنشاء مفتاح API' : 'Create API Key'}
                  </DialogTitle>
                  <DialogDescription>
                    {language === 'ar'
                      ? 'أعط هذا المفتاح اسمًا وصفيًا لتتذكر استخدامه'
                      : 'Give this key a descriptive name to remember its use'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{language === 'ar' ? 'اسم المفتاح' : 'Key Name'}</Label>
                    <Input
                      placeholder="Mobile App iOS"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialog(false)}>
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={() => {
                      handleCreate()
                      setCreateDialog(false)
                    }}
                  >
                    {language === 'ar' ? 'إنشاء' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المفتاح' : 'Key'}</TableHead>
                  <TableHead>{language === 'ar' ? 'أنشئ في' : 'Created'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-end">
                    {language === 'ar' ? 'إجراءات' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {language === 'ar'
                        ? 'لا توجد مفاتيح API. أنشئ أول مفتاح لك.'
                        : 'No API keys yet. Create your first key.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {showKeys[k.id] ? k.fullKey : `${k.keyPrefix}...`}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              setShowKeys((prev) => ({ ...prev, [k.id]: !prev[k.id] }))
                            }
                          >
                            {showKeys[k.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopy(k.fullKey, k.id)}
                          >
                            {copied === k.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={k.isActive ? 'default' : 'secondary'}>
                          {k.isActive
                            ? language === 'ar'
                              ? 'نشط'
                              : 'Active'
                            : language === 'ar'
                              ? 'ملغى'
                              : 'Revoked'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevoke(k.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {language === 'ar' ? 'استخدام API' : 'API Usage'}
            </CardTitle>
            <CardDescription>
              {language === 'ar'
                ? 'أضف رأس المصادقة إلى طلباتك'
                : 'Add the authentication header to your requests'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto font-mono">
              <code>{`curl https://your-domain.com/api/v1/stores \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</code>
            </pre>
            <p className="text-sm text-muted-foreground mt-4">
              {language === 'ar'
                ? 'عرض الوثائق الكاملة على'
                : 'View full documentation at'}{' '}
              <code className="bg-muted px-2 py-0.5 rounded">/api/v1/docs</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
