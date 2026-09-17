import Link from "next/link";
import { Card } from "@heroui/react";

import type { PublicCenter } from "../lib/centers";

type CenterCardProps = Readonly<{ center: PublicCenter }>;

export function CenterCard({ center }: CenterCardProps) {
  return (
    <Card className="border border-slate-200 bg-white p-5 shadow-sm">
      <Card.Header className="p-0">
        <p className="text-sm font-medium text-emerald-700">
          {center.category}
        </p>
        <Card.Title className="mt-1 text-xl font-semibold text-slate-950">
          {center.name}
        </Card.Title>
      </Card.Header>
      <Card.Content className="p-0 pt-2">
        <Card.Description className="text-slate-700">
          {center.description ?? "Información en actualización."}
        </Card.Description>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
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
      </Card.Content>
      <Card.Footer className="p-0 pt-5">
        <Link
          className="inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          href={`/centros/${center.code}`}
        >
          Ver ficha
        </Link>
      </Card.Footer>
    </Card>
  );
}
