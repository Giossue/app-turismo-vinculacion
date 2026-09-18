import Link from "next/link";

export default function NotFound() {
  return (
    <main className="statusMain">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="statusTitle">No encontramos esta ficha.</h1>
        <p className="statusText">
          Puede que no exista o que todavía no esté publicada.
        </p>
        <Link href="/" className="primaryButton statusButton">
          Ver atractivos
        </Link>
      </div>
    </main>
  );
}
