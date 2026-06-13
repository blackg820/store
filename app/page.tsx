'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useData } from '@/lib/data-context'
import { useTranslations } from '@/hooks/use-translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { user, login, isLoading, language, setLanguage } = useAuth()
  const { settings } = useData()
  const { t } = useTranslations()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const success = await login(email, password)

    if (success) {
      router.push('/dashboard')
    } else {
      setError('Invalid email or password')
    }

    setIsSubmitting(false)
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background dashboard-bg relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] rounded-full bg-accent/5 blur-[120px] animate-pulse delay-1000" />

      {/* Header */}
      <header className="p-8 flex items-center justify-between relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 group">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/20 transition-transform group-hover:scale-110 duration-500">
            <Store className="h-7 w-7 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter font-heading">{settings.site_name || 'Storify'}</span>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/60">{t('saasPlatform')}</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleLanguage} className="rounded-xl h-11 w-11 hover:bg-primary/5">
          <Globe className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-premium">
          <Card className="border-none shadow-2xl shadow-primary/5 bg-white/70 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6">
              <CardTitle className="text-3xl font-black tracking-tighter font-heading">{t('welcomeBack')}</CardTitle>
              <CardDescription className="text-base font-medium">{t('signInToContinue')}</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-bold text-center animate-in zoom-in-95 duration-300">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ms-1">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    dir="ltr"
                    className="h-12 rounded-xl bg-background/50 border-border focus:ring-4 ring-primary/10 transition-all text-base"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('password')}</Label>
                    <button type="button" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                      {t('forgotPassword' as any) || 'Forgot?'}
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    dir="ltr"
                    className="h-12 rounded-xl bg-background/50 border-border focus:ring-4 ring-primary/10 transition-all text-base"
                  />
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold shadow-xl shadow-primary/20" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    t('login')
                  )}
                </Button>
              </form>

              <div className="mt-10 pt-8 border-t border-border/50 text-center">
                <p className="text-sm font-medium text-muted-foreground mb-6">
                  {t('contactSaaS' as any) || 'Don\'t have an account?'}
                </p>
                {settings.saas_contact_whatsapp && (
                  <Button variant="outline" className="w-full h-12 gap-3 rounded-xl border-border hover:bg-success/5 hover:text-success hover:border-success/30 transition-all group" asChild>
                    <a href={`https://wa.me/${settings.saas_contact_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      <span className="font-bold">{t('contactOnWhatsapp' as any) || 'Contact Support'}</span>
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <p className="mt-10 text-center text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            {settings.site_name || 'Storify'} &bull; Enterprise Commerce OS
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center relative z-10">
        <p className="text-[10px] font-black text-muted-foreground/30 tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {settings.site_name || 'Storify'} &bull; All Rights Reserved
        </p>
      </footer>
    </div>
  )
}
