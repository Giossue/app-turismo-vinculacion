import { CenterCard } from "../components/center-card";
import { getPublicCenters } from "../lib/centers";

// La API local no está disponible durante un build de producción. Esta página se
// renderiza por petición y obtiene únicamente contenido que ya es público.
export const dynamic = "force-dynamic";

type HomePageProps = Readonly<{ searchParams: Promise<{ q?: string }> }>;

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const centers = await getPublicCenters(q);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-12 sm:px-8">
      <header className="max-w-2xl">
        <p className="font-semibold text-emerald-700">Guaranda · Ecuador</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          Descubre lugares que vale la pena conocer.
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-700">
          Información turística institucional, clara y publicada para ayudarte a
          planificar tu visita.
        </p>
      </header>
      <form className="mt-8 flex max-w-xl gap-3" role="search">
        <label className="sr-only" htmlFor="q">
          Buscar atractivos
        </label>
        <input
          className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-slate-950"
          defaultValue={q}
          id="q"
          name="q"
          placeholder="Buscar atractivos"
          type="search"
        />
        <button
          className="min-h-11 rounded-lg bg-emerald-700 px-4 font-medium text-white hover:bg-emerald-800"
          type="submit"
        >
          Buscar
        </button>
      </form>
      <section aria-labelledby="centros-publicados" className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="centros-publicados"
            className="text-2xl font-bold text-slate-950"
          >
            Atractivos publicados
          </h2>
          <p className="text-sm text-slate-600">
            {centers.length} disponible{centers.length === 1 ? "" : "s"}
          </p>
        </div>
        {centers.length === 0 ? (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-950">
            {q
              ? "No hay atractivos que coincidan con la búsqueda."
              : "Aún no hay atractivos publicados para mostrar."}
          </p>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {centers.map((center) => (
              <CenterCard key={center.code} center={center} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
