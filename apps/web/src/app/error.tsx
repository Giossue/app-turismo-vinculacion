"use client";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="statusMain">
      <div>
        <h1 className="statusTitle">No pudimos cargar los atractivos.</h1>
        <p className="statusText">Revisa tu conexión e inténtalo nuevamente.</p>
        <button
          className="primaryButton statusButton"
          onClick={reset}
          type="button"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}
