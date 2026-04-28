export interface ThemeSuggestion {
  id: string
  name: string
  nameAr: string
  colors: {
    primary: string
    secondary: string
    background: string
    foreground: string
    card: string
    accent: string
  }
}

export const THEME_SUGGESTIONS: ThemeSuggestion[] = [
  // --- Professional Dark Themes ---
  { id: 'midnight-onyx', name: 'Midnight Onyx', nameAr: 'أونيكس منتصف الليل', colors: { primary: '#3b82f6', secondary: '#1e293b', background: '#0f172a', foreground: '#f8fafc', card: '#1e293b', accent: '#60a5fa' } },
  { id: 'charcoal-gold', name: 'Charcoal Gold', nameAr: 'فحم وذهب', colors: { primary: '#d97706', secondary: '#1c1917', background: '#0c0a09', foreground: '#f5f5f4', card: '#1c1917', accent: '#fbbf24' } },
  { id: 'obsidian-emerald', name: 'Obsidian Emerald', nameAr: 'زمرد أسود', colors: { primary: '#10b981', secondary: '#064e3b', background: '#020617', foreground: '#ecfdf5', card: '#0f172a', accent: '#34d399' } },
  { id: 'deep-space', name: 'Deep Space', nameAr: 'فضاء عميق', colors: { primary: '#6366f1', secondary: '#312e81', background: '#030014', foreground: '#e0e7ff', card: '#1e1b4b', accent: '#818cf8' } },
  { id: 'volcano-ash', name: 'Volcano Ash', nameAr: 'رماد البركان', colors: { primary: '#ef4444', secondary: '#450a0a', background: '#0a0a0a', foreground: '#fef2f2', card: '#171717', accent: '#f87171' } },
  { id: 'navy-seal', name: 'Navy Seal', nameAr: 'البحرية', colors: { primary: '#0ea5e9', secondary: '#0c4a6e', background: '#082f49', foreground: '#f0f9ff', card: '#0c4a6e', accent: '#38bdf8' } },
  { id: 'vampire-night', name: 'Vampire Night', nameAr: 'ليل الفامباير', colors: { primary: '#be123c', secondary: '#4c0519', background: '#050102', foreground: '#fff1f2', card: '#1a040b', accent: '#fb7185' } },
  { id: 'cyber-neon', name: 'Cyber Neon', nameAr: 'سيبر نيون', colors: { primary: '#f43f5e', secondary: '#2d0622', background: '#000000', foreground: '#ffffff', card: '#111111', accent: '#22d3ee' } },
  { id: 'slate-pro', name: 'Slate Pro', nameAr: 'سليت احترافي', colors: { primary: '#64748b', secondary: '#334155', background: '#0f172a', foreground: '#f1f5f9', card: '#1e293b', accent: '#94a3b8' } },
  { id: 'royal-velvet', name: 'Royal Velvet', nameAr: 'مخمل ملكي', colors: { primary: '#8b5cf6', secondary: '#4c1d95', background: '#0f071d', foreground: '#f5f3ff', card: '#1e1335', accent: '#a78bfa' } },

  // --- Professional Light Themes ---
  { id: 'arctic-minimal', name: 'Arctic Minimal', nameAr: 'أركتيك بسيط', colors: { primary: '#0f172a', secondary: '#f1f5f9', background: '#ffffff', foreground: '#0f172a', card: '#ffffff', accent: '#64748b' } },
  { id: 'paper-white', name: 'Paper White', nameAr: 'ورق أبيض', colors: { primary: '#18181b', secondary: '#fafafa', background: '#fcfcfc', foreground: '#18181b', card: '#ffffff', accent: '#71717a' } },
  { id: 'soft-sand', name: 'Soft Sand', nameAr: 'رمل ناعم', colors: { primary: '#92400e', secondary: '#fef3c7', background: '#fffbeb', foreground: '#451a03', card: '#ffffff', accent: '#d97706' } },
  { id: 'mint-fresh', name: 'Mint Fresh', nameAr: 'نعناع منعش', colors: { primary: '#059669', secondary: '#f0fdf4', background: '#f9fafb', foreground: '#064e3b', card: '#ffffff', accent: '#10b981' } },
  { id: 'sakura-light', name: 'Sakura Light', nameAr: 'ساكورا فاتح', colors: { primary: '#db2777', secondary: '#fdf2f8', background: '#fffcfd', foreground: '#500724', card: '#ffffff', accent: '#f472b6' } },
  { id: 'cloud-nine', name: 'Cloud Nine', nameAr: 'سحاب', colors: { primary: '#2563eb', secondary: '#eff6ff', background: '#f8fafc', foreground: '#1e3a8a', card: '#ffffff', accent: '#60a5fa' } },
  { id: 'lavender-mist', name: 'Lavender Mist', nameAr: 'ضباب اللافندر', colors: { primary: '#7c3aed', secondary: '#f5f3ff', background: '#faf9ff', foreground: '#4c1d95', card: '#ffffff', accent: '#a78bfa' } },
  { id: 'peach-fuzz', name: 'Peach Fuzz', nameAr: 'خوخ ناعم', colors: { primary: '#f97316', secondary: '#fff7ed', background: '#fffcf9', foreground: '#7c2d12', card: '#ffffff', accent: '#fb923c' } },
  { id: 'sage-garden', name: 'Sage Garden', nameAr: 'حديقة الميرمية', colors: { primary: '#166534', secondary: '#f0fdf4', background: '#f7fee7', foreground: '#064e3b', card: '#ffffff', accent: '#22c55e' } },
  { id: 'cool-gray', name: 'Cool Gray', nameAr: 'رمادي هادئ', colors: { primary: '#374151', secondary: '#f3f4f6', background: '#ffffff', foreground: '#111827', card: '#ffffff', accent: '#9ca3af' } },

  // --- Luxury & Premium Themes ---
  { id: 'sahara-gold', name: 'Sahara Gold', nameAr: 'صحارى الذهبي', colors: { primary: '#d97706', secondary: '#451a03', background: '#fffbeb', foreground: '#451a03', card: '#ffffff', accent: '#f59e0b' } },
  { id: 'platinum-pro', name: 'Platinum Pro', nameAr: 'بلاتينيوم', colors: { primary: '#1e293b', secondary: '#e2e8f0', background: '#f8fafc', foreground: '#0f172a', card: '#ffffff', accent: '#94a3b8' } },
  { id: 'bordeaux-wine', name: 'Bordeaux Wine', nameAr: 'بوردو', colors: { primary: '#881337', secondary: '#fff1f2', background: '#fffafa', foreground: '#4c0519', card: '#ffffff', accent: '#e11d48' } },
  { id: 'emerald-luxury', name: 'Emerald Luxury', nameAr: 'زمردي فاخر', colors: { primary: '#059669', secondary: '#ecfdf5', background: '#f0fdf4', foreground: '#064e3b', card: '#ffffff', accent: '#10b981' } },
  { id: 'royal-purple-lux', name: 'Royal Purple Lux', nameAr: 'بنفسجي ملكي', colors: { primary: '#6d28d9', secondary: '#f5f3ff', background: '#faf5ff', foreground: '#2e1065', card: '#ffffff', accent: '#8b5cf6' } },
  { id: 'terracotta-sun', name: 'Terracotta Sun', nameAr: 'تيراكوتا', colors: { primary: '#c2410c', secondary: '#fff7ed', background: '#fff5f2', foreground: '#7c2d12', card: '#ffffff', accent: '#ea580c' } },
  { id: 'deep-ocean', name: 'Deep Ocean', nameAr: 'محيط عميق', colors: { primary: '#0369a1', secondary: '#f0f9ff', background: '#f0f7ff', foreground: '#0c4a6e', card: '#ffffff', accent: '#0ea5e9' } },
  { id: 'forest-fern', name: 'Forest Fern', nameAr: 'سرخس الغابة', colors: { primary: '#15803d', secondary: '#f0fdf4', background: '#f0fff4', foreground: '#064e3b', card: '#ffffff', accent: '#22c55e' } },
  { id: 'antique-rose', name: 'Antique Rose', nameAr: 'ورد قديم', colors: { primary: '#be185d', secondary: '#fdf2f8', background: '#fffafa', foreground: '#700d33', card: '#ffffff', accent: '#db2777' } },
  { id: 'slate-gold', name: 'Slate Gold', nameAr: 'سليت وذهب', colors: { primary: '#b45309', secondary: '#f8fafc', background: '#ffffff', foreground: '#0f172a', card: '#ffffff', accent: '#fbbf24' } },

  // --- Vibrant & Energetic Themes ---
  { id: 'electric-violet', name: 'Electric Violet', nameAr: 'بنفسجي كهربائي', colors: { primary: '#8b5cf6', secondary: '#1e1b4b', background: '#020617', foreground: '#ffffff', card: '#1e1b4b', accent: '#a78bfa' } },
  { id: 'neon-candy', name: 'Neon Candy', nameAr: 'حلوى نيون', colors: { primary: '#f472b6', secondary: '#2d0622', background: '#000000', foreground: '#ffffff', card: '#1a1a1a', accent: '#a855f7' } },
  { id: 'solar-flare', name: 'Solar Flare', nameAr: 'توهج شمسي', colors: { primary: '#f97316', secondary: '#431407', background: '#0c0a09', foreground: '#ffffff', card: '#1c1917', accent: '#fb923c' } },
  { id: 'arctic-blue', name: 'Arctic Blue', nameAr: 'أزرق قطبي', colors: { primary: '#38bdf8', secondary: '#0c4a6e', background: '#082f49', foreground: '#ffffff', card: '#0c4a6e', accent: '#7dd3fc' } },
  { id: 'lime-burst', name: 'Lime Burst', nameAr: 'ليمون مشع', colors: { primary: '#84cc16', secondary: '#1a2e05', background: '#050505', foreground: '#ffffff', card: '#111111', accent: '#bef264' } },
  { id: 'sunset-strip', name: 'Sunset Strip', nameAr: 'شريط الغروب', colors: { primary: '#f43f5e', secondary: '#4c0519', background: '#000000', foreground: '#ffffff', card: '#111111', accent: '#fb7185' } },
  { id: 'deep-sea-glow', name: 'Deep Sea Glow', nameAr: 'وهج البحر', colors: { primary: '#06b6d4', secondary: '#083344', background: '#020617', foreground: '#ffffff', card: '#083344', accent: '#22d3ee' } },
  { id: 'magenta-magic', name: 'Magenta Magic', nameAr: 'ماجنتا سحري', colors: { primary: '#d946ef', secondary: '#4a044e', background: '#0a000a', foreground: '#ffffff', card: '#1e011e', accent: '#f0abfc' } },
  { id: 'orange-punch', name: 'Orange Punch', nameAr: 'برتقال قوي', colors: { primary: '#ea580c', secondary: '#431407', background: '#0a0a0a', foreground: '#ffffff', card: '#171717', accent: '#fb923c' } },
  { id: 'cyan-wave', name: 'Cyan Wave', nameAr: 'موجة سيان', colors: { primary: '#0891b2', secondary: '#083344', background: '#000000', foreground: '#ffffff', card: '#0c0c0c', accent: '#22d3ee' } },

  // --- Minimalist & Balanced Themes ---
  { id: 'mono-pro', name: 'Mono Pro', nameAr: 'مونو احترافي', colors: { primary: '#000000', secondary: '#e5e5e5', background: '#f5f5f5', foreground: '#000000', card: '#ffffff', accent: '#737373' } },
  { id: 'slate-clean', name: 'Slate Clean', nameAr: 'سليت نظيف', colors: { primary: '#334155', secondary: '#f1f5f9', background: '#f8fafc', foreground: '#0f172a', card: '#ffffff', accent: '#94a3b8' } },
  { id: 'zinc-modern', name: 'Zinc Modern', nameAr: 'زنك حديث', colors: { primary: '#18181b', secondary: '#f4f4f5', background: '#fafafa', foreground: '#09090b', card: '#ffffff', accent: '#a1a1aa' } },
  { id: 'stone-organic', name: 'Stone Organic', nameAr: 'حجر عضوي', colors: { primary: '#44403c', secondary: '#f5f5f4', background: '#fafaf9', foreground: '#1c1917', card: '#ffffff', accent: '#a8a29e' } },
  { id: 'neutral-soft', name: 'Neutral Soft', nameAr: 'محايد ناعم', colors: { primary: '#404040', secondary: '#f5f5f5', background: '#fafafa', foreground: '#171717', card: '#ffffff', accent: '#a3a3a3' } },
  { id: 'blue-harmony', name: 'Blue Harmony', nameAr: 'هارموني أزرق', colors: { primary: '#1e40af', secondary: '#eff6ff', background: '#f8faff', foreground: '#1e3a8a', card: '#ffffff', accent: '#60a5fa' } },
  { id: 'teal-tranquil', name: 'Teal Tranquil', nameAr: 'تيل هادئ', colors: { primary: '#0f766e', secondary: '#f0fdfa', background: '#f9fdfd', foreground: '#134e4a', card: '#ffffff', accent: '#2dd4bf' } },
  { id: 'amber-glow', name: 'Amber Glow', nameAr: 'وهج كهرماني', colors: { primary: '#b45309', secondary: '#fffbeb', background: '#fffdf5', foreground: '#451a03', card: '#ffffff', accent: '#fbbf24' } },
  { id: 'rose-quartz', name: 'Rose Quartz', nameAr: 'كوارتز وردي', colors: { primary: '#be185d', secondary: '#fdf2f8', background: '#fffafd', foreground: '#500724', card: '#ffffff', accent: '#f472b6' } },
  { id: 'indigo-flow', name: 'Indigo Flow', nameAr: 'إنديغو ناعم', colors: { primary: '#4338ca', secondary: '#eef2ff', background: '#f9faff', foreground: '#312e81', card: '#ffffff', accent: '#818cf8' } }
]
