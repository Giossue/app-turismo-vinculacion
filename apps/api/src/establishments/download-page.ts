/** Descarga estable: el APK más reciente publicado en las versiones del repositorio. */
export const APP_DOWNLOAD_URL =
  "https://github.com/Giossue/app-turismo-vinculacion/releases/latest/download/rumbo-ec.apk";

const STYLE = `
body{margin:0;font-family:system-ui,sans-serif;background:#f4f7f5;color:#17231d;min-height:100vh;display:flex;align-items:center;justify-content:center}
main{max-width:460px;padding:24px 20px;text-align:center}
.mark{width:84px;height:84px;border-radius:22px;background:#176b4d;color:#fff;font-size:42px;line-height:84px;margin:0 auto 20px}
h1{margin:0 0 8px;font-size:1.8rem}
p{color:#4a5a52;line-height:1.5}
a.btn{display:block;margin:24px 0 8px;padding:16px;border-radius:14px;background:#176b4d;color:#fff;font-weight:700;font-size:1.1rem;text-decoration:none}
small{color:#5b6b63}
ol{text-align:left;color:#4a5a52;line-height:1.6;padding-left:22px;margin-top:28px}
`;

/** Ruta propia del archivo: el usuario nunca ve GitHub, solo este dominio. */
export const APP_DOWNLOAD_PATH = "/descargar/rumbo-ec.apk";

/** Página corta para bajar la app: un botón y tres pasos de instalación. */
export function renderDownloadPage(): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Descarga Rumbo EC</title><style>${STYLE}</style></head>
<body><main>
<div class="mark">⛰</div>
<h1>Rumbo EC</h1>
<p>Descubre atractivos, establecimientos y rutas turísticas, incluso sin conexión.</p>
<a class="btn" href="${APP_DOWNLOAD_PATH}">Descargar para Android</a>
<small>Archivo APK · gratuito</small>
<ol>
<li>Toca <b>Descargar</b> y abre el archivo cuando termine.</li>
<li>Si Android lo pide, permite <b>instalar apps de esta fuente</b>.</li>
<li>Pulsa <b>Instalar</b> y abre la app.</li>
</ol>
</main></body></html>`;
}
