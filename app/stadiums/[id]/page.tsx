import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Users } from "lucide-react";
import { MatchCard } from "@/components/matches/MatchCard";
import { StadiumImage } from "@/components/StadiumImage";
import { VENUES, getVenue, type VenueId, type HostCountry } from "@/lib/venues";
import { getMatchesForVenue } from "@/lib/queries";
import { flagUrl } from "@/lib/utils";

const COUNTRY_CODE: Record<HostCountry, string> = { USA: "us", Mexico: "mx", Canada: "ca" };

export function generateStaticParams() {
  return VENUES.map((v) => ({ id: v.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const stadium = getVenue(id as VenueId);
  return { title: stadium ? `${stadium.name} — ${stadium.city}` : "Stadium" };
}

export default async function StadiumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stadium = getVenue(id as VenueId);
  if (!stadium) notFound();

  const matches = await getMatchesForVenue(stadium.name);
  const flag = flagUrl(COUNTRY_CODE[stadium.country], 40);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <StadiumImage
          src={stadium.imageUrl}
          alt={stadium.name}
          className="aspect-[21/9] w-full"
          sizes="(min-width: 896px) 896px, 100vw"
          priority
        />
        <div className="p-6">
          <h1 className="text-3xl font-bold">{stadium.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {stadium.city}
            </span>
            <span className="flex items-center gap-1.5">
              {flag ? (
                <Image src={flag} alt={stadium.country} width={20} height={14} className="rounded-sm" unoptimized />
              ) : null}
              {stadium.country}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {stadium.capacity.toLocaleString()} capacity
            </span>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-semibold">
          Matches{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({matches.length})
          </span>
        </h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matches assigned to this stadium yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
