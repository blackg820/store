'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
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
  Database,
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

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
        <div className="h-20 w-20 rounded-3xl bg-warning/10 flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-warning" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tighter">
            {language === 'ar' ? 'غير مصرح لك بالدخول' : 'Access Denied'}
          </h2>
          <p className="text-muted-foreground font-medium max-w-sm mx-auto">
            {language === 'ar'
              ? 'هذا القسم مخصص لمالك المنصة فقط. يرجى التواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.'
              : 'This section is restricted to the SaaS owner. Please contact support if you believe this is an error.'}
          </p>
        </div>
      </div>
    )
  }

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
    <div className="space-y-12 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground font-heading">
            {language === 'ar' ? 'مفاتيح API' : 'API Keys'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-2xl leading-relaxed">
            Generate and manage secure access tokens for third-party integrations and mobile applications.
            Maintain high-security standards for your data access.
          </p>
        </div>
      </div>

      <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
        <Alert className="border-none bg-warning/5 rounded-2xl p-6 shadow-xl shadow-warning/5 border-l-4 border-l-warning">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle className="text-warning font-black uppercase tracking-widest text-[10px] mb-2">
            {language === 'ar' ? 'تحذير أمني' : 'Security Notice'}
          </AlertTitle>
          <AlertDescription className="text-sm font-medium text-warning/80 leading-relaxed">
            {language === 'ar'
              ? 'احتفظ بمفاتيح API في مكان آمن. لا تشاركها في أكواد عامة أو رسائل عامة. سيتم عرض المفتاح الكامل مرة واحدة فقط.'
              : 'Keep API keys secure. Do not share them in public code or messages. The full key is shown only once at creation.'}
          </AlertDescription>
        </Alert>

        {newKey && (
          <Alert className="border-none bg-primary/10 rounded-2xl p-6 shadow-xl shadow-primary/5 animate-in zoom-in duration-500">
            <Key className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-black uppercase tracking-widest text-[10px] mb-2">
              {language === 'ar' ? 'تم إنشاء مفتاح جديد' : 'New Key Created'}
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-sm font-medium text-primary/80">
                {language === 'ar'
                  ? 'انسخ هذا المفتاح الآن. لن تتمكن من رؤيته مرة أخرى.'
                  : 'Copy this key now. You will not be able to see it again.'}
              </p>
              <div className="flex items-center gap-2 p-4 rounded-xl bg-background/50 border border-primary/20 font-mono text-sm shadow-inner group">
                <code className="flex-1 break-all font-bold text-primary">{newKey}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="hover:bg-primary/10 rounded-lg h-9 w-9"
                  onClick={() => handleCopy(newKey, 'new')}
                >
                  {copied === 'new' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button size="sm" className="rounded-lg h-10 px-6 font-bold shadow-lg shadow-primary/20" onClick={() => setNewKey(null)}>
                {language === 'ar' ? 'لقد نسخته' : "I've copied it"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl shadow-primary/5 bg-card/30 backdrop-blur-sm rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">
                {language === 'ar' ? 'مفاتيح API الخاصة بك' : 'Your API Keys'}
              </CardTitle>
              <CardDescription className="text-sm font-medium">
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

        <Card className="border-none shadow-xl shadow-primary/5 bg-card/30 backdrop-blur-sm rounded-[2rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-2xl font-black tracking-tight">
              {language === 'ar' ? 'استخدام API' : 'API Usage'}
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              {language === 'ar'
                ? 'أضف رأس المصادقة إلى طلباتك'
                : 'Add the authentication header to your requests'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="relative group">
              <pre className="p-6 rounded-2xl bg-black/80 text-primary-foreground text-sm overflow-x-auto font-mono border border-white/5 shadow-2xl">
                <code className="leading-relaxed opacity-90">{`curl https://your-domain.com/api/v1/stores \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</code>
              </pre>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Database className="h-4 w-4 opacity-50" />
              {language === 'ar'
                ? 'عرض الوثائق الكاملة على'
                : 'View full documentation at'}{' '}
              <code className="bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary/10">/api/v1/docs</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
