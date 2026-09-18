import Link from "next/link";

import type { PublicCenter } from "../lib/centers";

type CenterCardProps = Readonly<{ center: PublicCenter }>;

export function CenterCard({ center }: CenterCardProps) {
  return (
    <article className="centerCard">
      <header className="centerCardHeader">
        <p className="cardCategory">{center.category}</p>
        <h2 className="cardTitle">{center.name}</h2>
      </header>
      <div className="cardContent">
        <p className="cardDescription">
          {center.description ?? "Información en actualización."}
        </p>
        <dl className="cardMeta">
          <div>
            <dt className="sr-only">Tipo</dt>
            <dd>{center.type}</dd>
          </div>
          <div>
            <dt className="sr-only">Jerarquía</dt>
            <dd>
              {center.hierarchy
                ? `Jerarquía ${center.hierarchy}`
                : "Sin jerarquía"}
            </dd>
          </div>
        </dl>
      </div>
      <footer className="cardFooter">
        <Link className="primaryButton" href={`/centros/${center.code}`}>
          Ver ficha
        </Link>
      </footer>
    </article>
  );
}
