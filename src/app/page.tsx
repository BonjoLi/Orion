import Link from "next/link";
import { Hero } from "@/components/Hero";
import { EventCard } from "@/components/EventCard";
import { listEvents } from "@/lib/events/catalog";

// LANDING PAGE — owned by the landing team.
// This file is the only page teammates need to touch for the landing work.
// Everything below is placeholder structure; replace freely. Keep the
// `href="/map"` CTA and the `/api/events` data flow so the map stays wired.

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const events = (await listEvents(new Date())).slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-6">
      <Hero />

      {/* TODO(landing owner): "How it works" — three steps: pick event → see heatmap → get plan */}
      <section className="py-12">
        <h2 className="text-xl font-semibold mb-6">Coming up</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>

      {/* TODO(landing owner): social proof / data credits strip (NASA, Open-Meteo, USNO, CelesTrak) */}
      <section className="py-12 text-center">
        <Link href="/map" className="inline-block rounded-full bg-sky-300 px-6 py-3 font-medium text-black hover:bg-sky-200">
          Open the map
        </Link>
      </section>
    </div>
  );
}
