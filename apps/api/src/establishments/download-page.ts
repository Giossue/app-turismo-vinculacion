import { APP_LOGO_DATA_URI } from "./app-logo";

/** Descarga estable: el APK más reciente publicado en las versiones del repositorio. */
export const APP_DOWNLOAD_URL =
  "https://github.com/Giossue/app-turismo-vinculacion/releases/latest/download/rumbo-ec.apk";

/** Última release publicada en GitHub; de ahí salen la versión y la fecha mostradas. */
export const APP_RELEASES_API_URL =
  "https://api.github.com/repos/Giossue/app-turismo-vinculacion/releases/latest";

const STYLE = `
body{margin:0;font-family:system-ui,sans-serif;background:#f4f7f5;color:#17231d;min-height:100vh;display:flex;align-items:center;justify-content:center}
main{max-width:460px;padding:24px 20px;text-align:center}
.mark{display:block;width:120px;height:auto;margin:0 auto 20px}
h1{margin:0 0 8px;font-size:1.8rem}
p{color:#4a5a52;line-height:1.5}
a.btn{display:block;margin:24px 0 8px;padding:16px;border-radius:14px;background:#176b4d;color:#fff;font-weight:700;font-size:1.1rem;text-decoration:none}
small{color:#5b6b63}
.version{margin:0;font-weight:600;color:#176b4d}
ol{text-align:left;color:#4a5a52;line-height:1.6;padding-left:22px;margin-top:28px}
`;

/** Ruta propia del archivo: el usuario nunca ve GitHub, solo este dominio. */
export const APP_DOWNLOAD_PATH = "/descargar/rumbo-ec.apk";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** «16 de octubre de 2026», en la zona horaria de Ecuador. */
export function formatReleaseDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return `${local.getUTCDate()} de ${MONTHS[local.getUTCMonth()]} de ${local.getUTCFullYear()}`;
}

/** Página corta para bajar la app: un botón y tres pasos de instalación. */
export function renderDownloadPage(
  release?: { version: string; publishedAt: string } | null,
): string {
  const date = release ? formatReleaseDate(release.publishedAt) : "";
  const versionLine = release
    ? `<p class="version">Versión ${release.version}${date ? ` · lanzada el ${date}` : ""}</p>`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Descarga Wasi Travel</title><style>${STYLE}</style></head>
<body><main>
<img class="mark" src="${APP_LOGO_DATA_URI}" alt="Logo de Wasi Travel">
<h1>Wasi Travel</h1>
<p>Descubre atractivos, establecimientos y rutas turísticas, incluso sin conexión.</p>
${versionLine}
<a class="btn" href="${APP_DOWNLOAD_PATH}">Descargar para Android</a>
<small>Archivo APK · gratuito</small>
<ol>
<li>Toca <b>Descargar</b> y abre el archivo cuando termine.</li>
<li>Si Android lo pide, permite <b>instalar apps de esta fuente</b>.</li>
<li>Pulsa <b>Instalar</b> y abre la app.</li>
</ol>
</main></body></html>`;
}
