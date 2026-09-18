import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicCenter } from "../../../lib/centers";

type CenterPageProps = Readonly<{ params: Promise<{ code: string }> }>;

export const dynamic = "force-dynamic";

export default async function CenterPage({ params }: CenterPageProps) {
  const { code } = await params;
  const center = await getPublicCenter(code);
  if (!center) notFound();

  return (
    <main className="siteMain siteMainNarrow">
      <Link href="/" className="backLink">
        Volver a atractivos
      </Link>
      <article className="centerArticle">
        <p className="eyebrow">
          {center.category} · {center.type}
        </p>
        <h1 className="pageTitle pageTitleDetail">{center.name}</h1>
        <p className="lead detailLead">
          {center.description ??
            "La descripción de este atractivo está en actualización."}
        </p>
        <dl className="detailsGrid">
          <div>
            <dt className="detailTerm">Clasificación</dt>
            <dd className="detailValue">{center.subtype}</dd>
          </div>
          <div>
            <dt className="detailTerm">Jerarquía</dt>
            <dd className="detailValue">{center.hierarchy ?? "Pendiente"}</dd>
          </div>
          <div>
            <dt className="detailTerm">Ubicación referencial</dt>
            <dd className="detailValue">
              {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
            </dd>
          </div>
          <div>
            <dt className="detailTerm">Código turístico</dt>
            <dd className="detailValue detailCode">{center.code}</dd>
          </div>
        </dl>
      </article>
    </main>
  );
}
