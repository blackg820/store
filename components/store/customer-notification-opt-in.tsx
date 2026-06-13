'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CustomerNotificationOptInProps {
  storeId: string
  storeName: string
  language: 'en' | 'ar' | 'ku'
}

const copy = {
  en: {
    title: 'Store updates',
    body: 'Get occasional product and order updates from this store.',
    phone: 'Phone number',
    subscribe: 'Enable updates',
    unsubscribe: 'Unsubscribe',
    unsupported: 'Push notifications are not fully supported in this browser. You can still save your phone preference.',
    denied: 'Notifications are blocked in your browser settings.',
    saved: 'Subscription saved.',
  },
  ar: {
    title: 'تحديثات المتجر',
    body: 'استلم تحديثات المنتجات والطلبات من هذا المتجر عند الحاجة.',
    phone: 'رقم الهاتف',
    subscribe: 'تفعيل التحديثات',
    unsubscribe: 'إلغاء الاشتراك',
    unsupported: 'الإشعارات غير مدعومة بالكامل في هذا المتصفح. يمكنك حفظ تفضيل الهاتف فقط.',
    denied: 'الإشعارات محظورة من إعدادات المتصفح.',
    saved: 'تم حفظ الاشتراك.',
  },
  ku: {
    title: 'نوێکارییەکانی فرۆشگا',
    body: 'هەندێک نوێکاری بەرهەم و داواکاری لەم فرۆشگایە وەربگرە.',
    phone: 'ژمارەی مۆبایل',
    subscribe: 'چالاککردنی نوێکاری',
    unsubscribe: 'لابردنی بەشداری',
    unsupported: 'ئاگادارکردنەوە لەم وێبگەڕەدا بە تەواوی پشتگیری ناکرێت. دەتوانیت تەنها تێلەفۆنەکەت پاشەکەوت بکەیت.',
    denied: 'ئاگادارکردنەوە لە ڕێکخستنەکانی وێبگەڕدا داخراوە.',
    saved: 'بەشداری پاشەکەوت کرا.',
  },
}

export function CustomerNotificationOptIn({ storeId, storeName, language }: CustomerNotificationOptInProps) {
  const labels = copy[language] || copy.ar
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'saved' | 'denied' | 'unsupported'>('idle')
  const [isSaving, setIsSaving] = useState(false)

  const unsupported = useMemo(() => {
    if (typeof window === 'undefined') return false
    return !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)
  }, [])

  useEffect(() => {
    if (unsupported) setStatus('unsupported')
    else if (Notification.permission === 'denied') setStatus('denied')
  }, [unsupported])

  const subscribe = async () => {
    if (!phone.trim()) return
    setIsSaving(true)
    try {
      let endpoint: string | null = null
      let keys: Record<string, string> | null = null

      if (!unsupported && Notification.permission !== 'denied') {
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
        if (permission === 'denied') {
          setStatus('denied')
        } else if (permission === 'granted') {
          const registration = await navigator.serviceWorker.ready
          const existing = await registration.pushManager.getSubscription()
          endpoint = existing?.endpoint || null
          const json = existing?.toJSON()
          keys = (json?.keys as Record<string, string> | undefined) || null
        }
      }

      await fetch('/api/v1/public/customer-notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          phone,
          channel: 'pwa',
          language,
          endpoint,
          keys,
          metadata: {
            browserPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
            source: 'storefront',
          },
        }),
      })
      setStatus('saved')
    } finally {
      setIsSaving(false)
    }
  }

  const unsubscribe = async () => {
    if (!phone.trim()) return
    setIsSaving(true)
    try {
      await fetch('/api/v1/public/customer-notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, phone, channel: 'pwa' }),
      })
      setStatus('idle')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="border-t border-[#DDE7DE] bg-[#F8FBF8]">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--store-primary)] ring-1 ring-[#DDE7DE]">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0B1412]">{labels.title}</p>
            <p className="text-sm text-[#66746A]">{labels.body} <span className="font-medium text-[#0B1412]">{storeName}</span></p>
            {status === 'unsupported' && <p className="mt-1 text-xs text-[#8A6A00]">{labels.unsupported}</p>}
            {status === 'denied' && <p className="mt-1 text-xs text-[#A13825]">{labels.denied}</p>}
            {status === 'saved' && <p className="mt-1 text-xs text-[#24724F]">{labels.saved}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:min-w-[360px] sm:flex-row">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={labels.phone} className="h-11 rounded-full border-[#DDE7DE] bg-white text-[#0B1412]" />
          <Button onClick={subscribe} disabled={isSaving || !phone.trim()} className="h-11 rounded-full bg-[#0B1412] px-5 text-white hover:bg-[#20302B]">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            {labels.subscribe}
          </Button>
          {status === 'saved' && (
            <Button onClick={unsubscribe} disabled={isSaving} variant="outline" className="h-11 rounded-full border-[#DDE7DE]">
              <BellOff className="h-4 w-4" />
              {labels.unsubscribe}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
