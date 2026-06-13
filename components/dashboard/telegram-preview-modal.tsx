'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Product, Store } from '@/lib/types'
import { Send, Loader2, MessageSquare, ImageIcon, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from '@/hooks/use-translations'

interface TelegramPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  store: Store | null
}

export function TelegramPreviewModal({ isOpen, onClose, product, store }: TelegramPreviewModalProps) {
  const { t } = useTranslations()
  const [isSending, setIsSending] = useState(false)

  if (!product || !store) return null

  const handleSend = async () => {
    setIsSending(true)
    const toastId = toast.loading(t('sendingToTelegram' as any) || 'Sending to Telegram...')

    try {
      const res = await fetch(`/api/v1/products/${product.id}/telegram`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('storify_access_token')}`
        }
      })

      const data = await res.json()
      if (data.success) {
        toast.success(t('postedSuccessfully' as any) || 'Posted to Telegram!', { id: toastId })
        onClose()
      } else {
        toast.error(data.error || t('failedToPost' as any), { id: toastId })
      }
    } catch (error) {
      toast.error(t('connectionError' as any), { id: toastId })
    } finally {
      setIsSending(false)
    }
  }

  const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#1c1c1c] text-white border-white/10 rounded-[2rem] overflow-hidden p-0 shadow-2xl ring-1 ring-white/10">
        <div className="bg-[#242424] p-6 border-b border-white/5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">{t('telegramPreview' as any) || 'Telegram Preview'}</DialogTitle>
            <DialogDescription className="text-[10px] font-black opacity-40 uppercase tracking-widest">{t('howItAppears' as any) || 'How it will look in your channel'}</DialogDescription>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mock Telegram Post */}
          <div className="bg-[#181818] rounded-2xl overflow-hidden shadow-inner border border-white/5">
            {product.media && product.media.length > 0 && (
              <div className="relative aspect-video">
                <img
                  src={product.media[0].url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {product.media.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 border border-white/10">
                    <ImageIcon className="h-3 w-3" />
                    <span className="text-[9px] font-bold">1/{product.media.length}</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <h4 className="font-bold text-base leading-tight">🛍️ {product.title}</h4>
                <p className="text-xs opacity-70 line-clamp-3 leading-relaxed">{product.description}</p>
              </div>

              <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{t('price' as any)}:</span>
                  <span className="text-sm font-black text-primary">{finalPrice.toLocaleString()} IQD</span>
                </div>
                {product.discount && (
                   <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{t('discount' as any)}:</span>
                    <span className="text-[10px] font-bold text-success">-{product.discount}% OFF</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <div className="bg-[#2a2a2a] py-2 rounded-xl text-center text-xs font-bold text-sky-400 border border-sky-400/20">
                  {t('viewProduct' as any) || 'View Product'} 🔗
                </div>
                <div className="bg-[#2a2a2a] py-2 rounded-xl text-center text-xs font-bold text-sky-400 border border-sky-400/20">
                  {t('visitStore' as any) || 'Visit Store'} 🏠
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-tight text-primary">{t('proPosting' as any) || 'Professional Media Group'}</p>
              <p className="text-[10px] opacity-60 leading-normal">{t('proPostingDesc' as any) || 'All product images will be sent as a professional media group with a clean caption.'}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-[#242424] border-t border-white/5">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest opacity-60 hover:opacity-100">
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="rounded-xl h-12 px-10 font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-primary/20"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t('postNow' as any) || 'Post Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
