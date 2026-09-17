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
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center font-medium text-emerald-800 underline underline-offset-4"
      >
        Volver a atractivos
      </Link>
      <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="font-semibold text-emerald-700">
          {center.category} · {center.type}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
          {center.name}
        </h1>
        <p className="mt-5 text-lg leading-8 text-slate-700">
          {center.description ??
            "La descripción de este atractivo está en actualización."}
        </p>
        <dl className="mt-8 grid gap-5 border-t border-slate-200 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-600">
              Clasificación
            </dt>
            <dd className="mt-1 text-slate-950">{center.subtype}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">Jerarquía</dt>
            <dd className="mt-1 text-slate-950">
              {center.hierarchy ?? "Pendiente"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">
              Ubicación referencial
            </dt>
            <dd className="mt-1 text-slate-950">
              {center.latitude.toFixed(5)}, {center.longitude.toFixed(5)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600">
              Código turístico
            </dt>
            <dd className="mt-1 font-mono text-sm text-slate-950">
              {center.code}
            </dd>
          </div>
        </dl>
      </article>
    </main>
  );
}
