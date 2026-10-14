import { notFound } from "next/navigation";

import { apiOrigin, getPublicEstablishment } from "../../../lib/establishments";

type EstablishmentPageProps = Readonly<{ params: Promise<{ id: string }> }>;

export const dynamic = "force-dynamic";

/** Destino del código QR pegado en cada establecimiento. */
export default async function EstablishmentPage({
  params,
}: EstablishmentPageProps) {
  const { id } = await params;
  const establishment = await getPublicEstablishment(id);
  if (!establishment) notFound();
  const category = establishment.categoriaEtiqueta ?? establishment.categoria;
  const hasLocation =
    establishment.latitude !== null && establishment.longitude !== null;

  return (
    <main className="siteMain siteMainNarrow">
      <article className="centerArticle">
        {category ? <p className="eyebrow">{category}</p> : null}
        <h1 className="pageTitle pageTitleDetail">
          {establishment.nombreComercial}
        </h1>
        <p className="lead detailLead">{establishment.actividad}</p>
        {establishment.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={establishment.nombreComercial}
            src={`${apiOrigin}${establishment.photos[0].url}`}
            style={{ width: "100%", borderRadius: 12, marginBottom: 16 }}
          />
        ) : null}
        <dl className="detailsGrid">
          {establishment.clasificacion ? (
            <div>
              <dt className="detailTerm">Tipo</dt>
              <dd className="detailValue">{establishment.clasificacion}</dd>
            </div>
          ) : null}
          <div>
            <dt className="detailTerm">Ubicación</dt>
            <dd className="detailValue">
              {establishment.direccion ?? establishment.localityName}
            </dd>
          </div>
          {establishment.telefono ? (
            <div>
              <dt className="detailTerm">Teléfono</dt>
              <dd className="detailValue">{establishment.telefono}</dd>
            </div>
          ) : null}
        </dl>
        <p>
          <a
            className="backLink"
            href={`rumbo-ec://establishments/${establishment.id}`}
          >
            Abrir en la app
          </a>
        </p>
        {hasLocation ? (
          <p>
            <a
              className="backLink"
              href={`https://www.google.com/maps/dir/?api=1&destination=${establishment.latitude},${establishment.longitude}`}
            >
              Cómo llegar
            </a>
          </p>
        ) : null}
      </article>
    </main>
  );
}
