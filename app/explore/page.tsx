import { prisma } from "@/prisma/prisma";
import Link from "next/link";
import { ArrowRight, MapPin, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connection } from "next/server";
import { Suspense } from "react";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Explore Businesses | Service Flow",
  description:
    "Browse trusted local businesses using Service Flow for their appointments and management.",
  image: "/og-image.png",
});

export default function ExplorePage() {
  return (
    <main className="min-h-screen bg-slate-50/50 relative">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_800px_at_top_right,var(--tw-gradient-stops))] from-emerald-50/40 via-transparent to-transparent" />

      <div className="container mx-auto px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16 space-y-6">
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Discover Local Gems
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Find the perfect service
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
            Book appointments with top-rated salons, barbershops, and spas
            across the Philippines.
          </p>
        </div>

        <Suspense fallback={<BusinessListSkeleton />}>
          <BusinessList />
        </Suspense>
      </div>
    </main>
  );
}

async function BusinessList() {
  await connection();

  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      initials: true,
      imageUrl: true,
      description: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-3xl border border-dashed border-slate-300">
        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Search className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          No businesses found
        </h3>
        <p className="text-slate-500 max-w-sm mt-2">
          We couldn't find any businesses listed publicly yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((business) => (
        <Link
          key={business.id}
          href={`/${business.slug}`}
          className="group relative flex flex-col bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-300 hover:-translate-y-1"
        >
          {/* Decorative Pattern Header */}
          <div className="h-32 bg-linear-to-br from-emerald-100/50 via-teal-50/30 to-slate-50 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-white/40 to-transparent" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-200/20 rounded-full blur-2xl" />
          </div>

          <div className="px-6 pb-6 flex-1 flex flex-col relative">
            {/* Floating Avatar */}
            <div className="-mt-10 mb-4 inline-flex">
              <div className="h-20 w-20 rounded-2xl bg-white p-1.5 shadow-md shadow-slate-200 ring-1 ring-slate-100 overflow-hidden relative">
                {business.imageUrl ? (
                  <img
                    src={business.imageUrl}
                    alt={business.name}
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-full w-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-bold text-white shadow-inner">
                    {business.initials}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {business.name}
                </h3>
                <div className="flex items-center text-sm font-medium text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-emerald-500/80" />
                  Philippines
                </div>
                {business.description && (
                  <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                    {business.description}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                  Service Provider
                </span>
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  Verified
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-sm group/btn">
              <span className="text-slate-500 group-hover:text-emerald-600 transition-colors font-medium">
                View Profile
              </span>
              <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function BusinessListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm h-[320px] animate-pulse"
        >
          <div className="h-32 bg-slate-100" />
          <div className="px-6 pb-6 relative">
            <div className="-mt-10 mb-4 h-20 w-20 rounded-2xl bg-slate-200 border-4 border-white" />
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-slate-200 rounded" />
              <div className="h-4 w-1/2 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
