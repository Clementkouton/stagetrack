import { db } from "@/lib/db";
import { OffersClient, type OfferRow } from "@/components/entreprise/offers-client";

export const dynamic = "force-dynamic";

export default async function EntrepriseOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const params = await searchParams;
  const offers = await db.offer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { candidatures: true } } },
  });

  const rows: OfferRow[] = offers.map((o) => ({
    id: o.id,
    title: o.title,
    sector: o.sector,
    city: o.city,
    duration: o.duration,
    workMode: o.workMode,
    contractType: o.contractType,
    gratification: o.gratification,
    status: o.status,
    aiGenerated: o.aiGenerated,
    candidateCount: o._count.candidatures,
    createdAt: o.createdAt.toISOString(),
  }));

  return <OffersClient offers={rows} autoOpen={params.create === "1"} />;
}
