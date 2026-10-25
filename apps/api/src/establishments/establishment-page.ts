/** Datos mínimos que muestra la página del código QR de un establecimiento. */
export type EstablishmentPageData = {
  id: number;
  nombreComercial: string;
  actividad: string;
  categoria: string | null;
  categoriaEtiqueta?: string | null;
  direccion: string | null;
  telefono: string | null;
  latitude: number | null;
  longitude: number | null;
  localityName: string;
  photos: ReadonlyArray<{ url: string }>;
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

const STYLE = `
body{margin:0;font-family:system-ui,sans-serif;background:#f4f7f5;color:#17231d}
main{max-width:560px;margin:0 auto;padding:24px 16px}
.card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
img{display:block;width:100%;max-height:260px;object-fit:cover}
.body{padding:20px}
h1{margin:0 0 4px;font-size:1.5rem}
.tag{color:#176b4d;font-weight:600;margin:0 0 12px}
dl{margin:16px 0}dt{font-size:.8rem;color:#5b6b63}dd{margin:0 0 12px}
a.btn{display:block;text-align:center;padding:14px;border-radius:12px;margin-top:10px;font-weight:600;text-decoration:none}
a.primary{background:#176b4d;color:#fff}a.secondary{background:#e3efe9;color:#176b4d}
.download{margin:16px 0 0;text-align:center;color:#5b6b63}.download a{color:#176b4d;font-weight:600}
`;

/** Pie común: quien no tiene la app puede descargarla desde aquí. */
const DOWNLOAD_FOOTER = `<p class="download">¿No tienes Wasi Travel? <a href="/descargar">Descarga la app</a></p>`;

/** Página pública mínima; los enlaces compartidos (`/c`, `/r`) la reutilizan. */
export function renderPublicPage(title: string, content: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>
<body><main>${content}${DOWNLOAD_FOOTER}</main></body></html>`;
}

/** Enlace «Cómo llegar» de Google Maps para quien abre la página sin la app. */
export function directionsLink(latitude: number, longitude: number): string {
  return `<a class="btn secondary" href="https://www.google.com/maps/dir/?api=1&amp;destination=${latitude},${longitude}">Cómo llegar</a>`;
}

export function renderEstablishmentPage(data: EstablishmentPageData): string {
  const category = data.categoriaEtiqueta ?? data.categoria;
  const photo = data.photos[0];
  const rows = [
    ["Ubicación", data.direccion ?? data.localityName],
    ["Teléfono", data.telefono],
  ]
    .filter((row): row is [string, string] => Boolean(row[1]))
    .map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`)
    .join("");
  const directions =
    data.latitude !== null && data.longitude !== null
      ? directionsLink(data.latitude, data.longitude)
      : "";
  return renderPublicPage(
    data.nombreComercial,
    `<div class="card">${
      photo ? `<img src="${escapeHtml(photo.url)}" alt="">` : ""
    }<div class="body"><h1>${escapeHtml(data.nombreComercial)}</h1>
<p class="tag">${escapeHtml([category, data.actividad].filter(Boolean).join(" · "))}</p>
<dl>${rows}</dl>
<a class="btn primary" href="rumbo-ec://establishments/${data.id}">Abrir en la app</a>
${directions}</div></div>`,
  );
}

export function renderEstablishmentNotFound(): string {
  return renderPublicPage(
    "Establecimiento no encontrado",
    `<div class="card"><div class="body"><h1>No encontramos este establecimiento</h1>
<p>Puede que ya no esté publicado.</p></div></div>`,
  );
}
