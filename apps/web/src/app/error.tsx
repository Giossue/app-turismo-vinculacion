"use client";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-5 text-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">
          No pudimos cargar los atractivos.
        </h1>
        <p className="mt-3 text-slate-700">
          Revisa tu conexión e inténtalo nuevamente.
        </p>
        <button
          className="mt-6 min-h-11 rounded-lg bg-emerald-700 px-4 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          onClick={reset}
          type="button"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
