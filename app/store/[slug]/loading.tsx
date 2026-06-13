import { Skeleton } from '@/components/ui/skeleton'

export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-[#F7FAF7]">
      <header className="sticky top-0 z-50 border-b border-[#DDE7DE] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full bg-[#E4ECE5]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 bg-[#E4ECE5]" />
              <Skeleton className="h-3 w-20 bg-[#E4ECE5]" />
            </div>
          </div>
          <Skeleton className="h-10 w-24 rounded-full bg-[#E4ECE5]" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-[28px] border border-[#DDE7DE] bg-white shadow-sm">
          <Skeleton className="h-48 w-full rounded-none bg-[#E4ECE5] sm:h-64" />
          <div className="relative px-5 pb-7 pt-16 text-center sm:px-8 sm:pb-8 sm:pt-20">
            <Skeleton className="absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E4ECE5] sm:h-32 sm:w-32" />
            <Skeleton className="mx-auto h-9 w-56 bg-[#E4ECE5]" />
            <Skeleton className="mx-auto mt-3 h-4 w-full max-w-md bg-[#E4ECE5]" />
            <Skeleton className="mx-auto mt-2 h-4 w-64 bg-[#E4ECE5]" />
            <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-[#DDE7DE]">
              <Skeleton className="h-16 rounded-none bg-[#E4ECE5]" />
              <Skeleton className="h-16 rounded-none bg-[#E4ECE5]" />
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Skeleton className="h-10 w-36 rounded-full bg-[#E4ECE5]" />
              <Skeleton className="h-10 w-32 rounded-full bg-[#E4ECE5]" />
            </div>
          </div>
        </section>

        <section className="space-y-4 py-8">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32 bg-[#E4ECE5]" />
              <Skeleton className="h-4 w-44 bg-[#E4ECE5]" />
            </div>
            <Skeleton className="h-9 w-28 rounded-full bg-[#E4ECE5]" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-28 min-w-36 rounded-[18px] bg-[#E4ECE5]" />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <Skeleton className="h-6 w-44 bg-[#E4ECE5]" />
            <Skeleton className="h-9 w-28 rounded-full bg-[#E4ECE5]" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="overflow-hidden rounded-[20px] border border-[#DDE7DE] bg-white">
                <Skeleton className="aspect-[4/5] w-full rounded-none bg-[#E4ECE5]" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-4 w-20 bg-[#E4ECE5]" />
                  <Skeleton className="h-5 w-full bg-[#E4ECE5]" />
                  <Skeleton className="h-5 w-24 bg-[#E4ECE5]" />
                  <Skeleton className="h-10 w-full rounded-full bg-[#E4ECE5]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
