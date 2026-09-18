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
    <main className="siteMain siteMainWide">
      <header className="siteHeader">
        <p className="eyebrow">Guaranda · Ecuador</p>
        <h1 className="pageTitle pageTitleHero">
          Descubre lugares que vale la pena conocer.
        </h1>
        <p className="lead">
          Información turística institucional, clara y publicada para ayudarte a
          planificar tu visita.
        </p>
      </header>
      <form className="searchForm" role="search">
        <label className="srOnly" htmlFor="q">
          Buscar atractivos
        </label>
        <input
          className="searchInput"
          defaultValue={q}
          id="q"
          name="q"
          placeholder="Buscar atractivos"
          type="search"
        />
        <button className="primaryButton" type="submit">
          Buscar
        </button>
      </form>
      <section
        aria-labelledby="centros-publicados"
        className="publishedSection"
      >
        <div className="sectionHeader">
          <h2 id="centros-publicados" className="sectionTitle">
            Atractivos publicados
          </h2>
          <p className="resultCount">
            {centers.length} disponible{centers.length === 1 ? "" : "s"}
          </p>
        </div>
        {centers.length === 0 ? (
          <p className="emptyState">
            {q
              ? "No hay atractivos que coincidan con la búsqueda."
              : "Aún no hay atractivos publicados para mostrar."}
          </p>
        ) : (
          <div className="centerGrid">
            {centers.map((center) => (
              <CenterCard key={center.code} center={center} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
