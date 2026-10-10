import Link from "next/link";

// TODO(landing owner): this is a placeholder hero. Own it.
export function Hero() {
  return (
    <section className="py-24">
      <p className="mb-3 text-sm uppercase tracking-widest text-sky-300">Into the skies</p>
      <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
        Know where the sky will be clear before you drive.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-300">
        Pick a meteor shower, an ISS pass, or an eclipse. Orion scores every spot within reach, hour by hour, on
        clouds, darkness, the Moon, and where the event sits in the sky, then writes you a plan.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/map" className="rounded-full bg-sky-300 px-6 py-3 font-medium text-black hover:bg-sky-200">
          Find a spot
        </Link>
      </div>
    </section>
  );
}
