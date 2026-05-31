import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Users } from "lucide-react";
import { StadiumImage } from "@/components/StadiumImage";
import { VENUES, type HostCountry } from "@/lib/venues";
import { flagUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Stadiums" };

const COUNTRY_CODE: Record<HostCountry, string> = { USA: "us", Mexico: "mx", Canada: "ca" };
const COUNTRY_ORDER: HostCountry[] = ["USA", "Mexico", "Canada"];

function CountryFlag({ country }: { country: HostCountry }) {
  const src = flagUrl(COUNTRY_CODE[country], 40);
  if (!src) return null;
  return (
    <Image src={src} alt={country} width={20} height={14} className="rounded-sm" unoptimized />
  );
}

export default function StadiumsPage() {
  const byCountry = new Map<HostCountry, typeof VENUES>();
  for (const v of VENUES) {
    if (!byCountry.has(v.country)) byCountry.set(v.country, []);
    byCountry.get(v.country)!.push(v);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold">Stadiums</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        The 16 stadiums hosting FIFA World Cup 2026 across the United States, Mexico and Canada.
      </p>

      <div className="space-y-8">
        {COUNTRY_ORDER.map((country) => {
          const stadiums = byCountry.get(country);
          if (!stadiums || stadiums.length === 0) return null;
          return (
            <section key={country}>
              <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                <CountryFlag country={country} />
                {country}
                <span className="text-sm font-normal text-muted-foreground">
                  · {stadiums.length} stadiums
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stadiums.map((v) => (
                  <Link
                    key={v.id}
                    href={`/stadiums/${v.id}`}
                    className="block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:bg-muted/50"
                  >
                    <StadiumImage
                      src={v.imageUrl}
                      alt={v.name}
                      className="aspect-[16/9] w-full"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold">{v.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {v.city}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="size-3.5" />
                        {v.capacity.toLocaleString()} capacity
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
