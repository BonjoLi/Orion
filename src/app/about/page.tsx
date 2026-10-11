// ABOUT PAGE — owned by the landing team.
// Skeleton with placeholder copy: fill in the real story, steps, team,
// and credits before shipping. Keep the structure, swap the placeholder text.

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      {/* Header */}
      <section className="max-w-3xl">
        <p className="mb-3 text-sm uppercase tracking-widest text-sky-300">About</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Placeholder — what Orion is for.
        </h1>
        <p className="mt-6 text-lg text-slate-300">
          Placeholder — one paragraph on why we built Orion. Pick a sky event, see where the sky
          will be clear and dark, and get a plan before you drive.
        </p>
      </section>

      {/* What we do */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold">What we do</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {["Feature one", "Feature two", "Feature three"].map((label) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-2 text-sm text-slate-300">
                Placeholder — short line describing this and what it unlocks.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {["Pick an event", "See the heatmap", "Get a plan"].map((step, i) => (
            <li key={step} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-3xl font-light text-sky-300/70">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 font-semibold">{step}</h3>
              <p className="mt-1 text-sm text-slate-300">
                Placeholder — explain this step in a sentence or two.
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* The team */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold">The team</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Name", "Name", "Name", "Name"].map((name, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-sm text-slate-400">Placeholder role</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data & credits */}
      <section className="mt-16">
        <h2 className="text-xl font-semibold">Data & credits</h2>
        <p className="mt-4 max-w-2xl text-slate-300">
          Placeholder — list the data sources and people behind Orion: weather, orbits, eclipses,
          night lights, and the map.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-400">
          <li>Placeholder — source one</li>
          <li>Placeholder — source two</li>
          <li>Placeholder — source three</li>
        </ul>
      </section>
    </div>
  );
}
