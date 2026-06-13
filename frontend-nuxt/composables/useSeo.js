export function useSeo(input) {
  const title = input.title
  const description = input.description || 'Dokani storefront'
  const image = input.image || undefined

  useSeoMeta({
    title,
    ogTitle: title,
    description,
    ogDescription: description,
    ogImage: image,
    twitterCard: image ? 'summary_large_image' : 'summary',
  })

  if (input.canonical) {
    useHead({
      link: [{ rel: 'canonical', href: input.canonical }],
    })
  }

  if (input.jsonLd) {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(input.jsonLd),
        },
      ],
    })
  }
}
