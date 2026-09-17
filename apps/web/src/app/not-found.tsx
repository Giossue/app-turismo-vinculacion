import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl place-items-center px-5 text-center">
      <div>
        <p className="font-semibold text-emerald-700">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          No encontramos esta ficha.
        </h1>
        <p className="mt-3 text-slate-700">
          Puede que no exista o que todavía no esté publicada.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 font-medium text-white"
        >
          Ver atractivos
        </Link>
      </div>
    </main>
  );
}
