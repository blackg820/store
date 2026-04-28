# How to Add a New Language

Supporting a new language in Storify is now very easy. Follow these steps:

## 1. Create a Locale File
Create a new JSON file in the `locales/` directory. For example, to add Turkish, create `locales/tr.json`.
Copy the contents of `locales/en.json` and translate the values.

```bash
cp locales/en.json locales/tr.json
```

## 2. Register the Language
Open `lib/types.ts` and perform the following updates:

### A. Import the new JSON file
```typescript
import tr from '../locales/tr.json'
```

### B. Update the `Language` type
```typescript
export type Language = 'ar' | 'en' | 'ku' | 'tr'
```

### C. Add it to the `translations` dictionary
```typescript
export const translations: Record<Language, any> = {
  en,
  ar,
  ku,
  tr
}
```

## 3. Update the UI Switcher (Optional)
If you want the new language to appear in the storefront switcher, update the `toggleLanguage` function in:
- `app/store/[slug]/page.tsx`
- `app/store/[slug]/product/[productId]/page.tsx`

```typescript
const toggleLanguage = () => {
  setLanguage(prev => {
    if (prev === 'ar') return 'ku'
    if (prev === 'ku') return 'tr' // Add your new language here
    if (prev === 'tr') return 'en'
    return 'ar'
  })
}
```

That's it! The system will automatically use the translations from your new JSON file.
