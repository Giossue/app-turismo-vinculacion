/** Mapas sin conexión y compartir. */
export const offlineEs = {
  title: "Mapas sin conexión",
  preparing: "Preparando tus mapas sin conexión…",
  downloaded: "Mapas descargados",
  onDevice: (size: string) => `${size} en este dispositivo`,
  downloadAnother: "Descargar otro mapa",
  available: "Ciudades disponibles",
  storedFailed:
    "No pudimos revisar las ciudades guardadas en este dispositivo.",
  loadingAvailable: "Cargando mapas disponibles…",
  availableOffline:
    "Conéctate a internet para consultar otras ciudades. Tus descargas siguen disponibles arriba.",
  noneAvailable: "Aún no hay mapas de ciudades disponibles para descargar.",
  city: {
    title: "Ciudad descargada",
    preparing: "Preparando tus mapas guardados…",
    opening: "Abriendo el mapa guardado…",
    readFailed: "No pudimos leer esta descarga. Inténtalo de nuevo.",
    notStored: "Esta ciudad no está guardada en el dispositivo.",
    summary: (places: number, routes: number) =>
      `Ciudad descargada · ${places} lugares · ${routes} recorridos`,
    searchLabel: "Buscar entre los lugares y rutas descargados",
    searchPlaceholder: "Buscar lugares y rutas descargados",
    legacy:
      "Actualiza esta descarga con internet para guardar el estilo del mapa y los nuevos lugares.",
    locate: "Mostrar mi ubicación en la ciudad descargada",
    noMatches: "No hay lugares o rutas descargados que coincidan.",
    severalPlaces: "Varios lugares aquí",
    pointOfInterest: "Punto de interés",
  },
  details: {
    approximate: "Ubicación aproximada.",
    directionsOnline: "Cómo llegar con internet",
    routesIncluded:
      "Este mapa incluye los recorridos publicados de la ciudad. Para calcular un trayecto desde tu ubicación necesitas internet.",
    transitRoute:
      "Recorrido de transporte publicado. Puedes verlo en el mapa. No es una ruta calculada desde tu ubicación.",
    duration: (minutes: number, estimated: boolean) =>
      `Duración ${estimated ? "aproximada" : "publicada"}: ${minutes} minutos.`,
    noDirections: "Este recorrido no incluye indicaciones publicadas.",
    outsideArea:
      "El mapa de calles está disponible dentro de la zona descargada. El recorrido puede continuar fuera de esa zona.",
  },
  card: {
    updateAvailable: "Actualización disponible",
    available: "Disponible",
    newerVersion:
      "Hay una versión más reciente de esta ciudad. Actualízala para ver los últimos lugares publicados.",
    open: "Abrir ciudad descargada",
    updating: (progress: number) => `Actualizando ${progress}%`,
    update: "Actualizar",
    remove: "Borrar",
    downloading: (progress: number) => `Descargando ${progress}%`,
    download: "Descargar ciudad",
    noPackage: "Esta ciudad aún no tiene lugares publicados para descargar.",
  },
  usage: {
    occupies: (total: string) => `Ocupa ${total}`,
    occupiesDetail: (total: string, map: string, content: string) =>
      `Ocupa ${total} (mapa ${map} · lugares ${content})`,
    updatedAt: (date: string) => `Actualizado el ${date}`,
  },
  errors: {
    generic:
      "No pudimos descargar la ciudad. Revisa tu conexión e inténtalo de nuevo.",
    removing: "Espera a que termine de borrarse esta ciudad.",
    downloading: "Espera a que termine la descarga de esta ciudad.",
    noPackage: "La ciudad no tiene un paquete publicado.",
    wrongPackage: "El paquete recibido no corresponde a esta ciudad.",
    newerStored: "La ciudad ya tiene una versión más reciente descargada.",
    style:
      "No pudimos preparar el mapa. Revisa tu conexión e inténtalo de nuevo.",
    save: "Descargamos el mapa, pero no pudimos guardar la ciudad en el dispositivo.",
    tiles:
      "No pudimos descargar los mapas de esta ciudad. Revisa tu conexión e inténtalo de nuevo.",
    prepare: "No pudimos preparar la descarga de esta ciudad.",
    webOnly:
      "Las descargas de mapas solo están disponibles en la app para Android e iOS.",
    remove: "No pudimos borrar toda la ciudad. Inténtalo de nuevo.",
    cities: "No pudimos cargar las ciudades offline.",
    citiesInvalid: "El catálogo offline no es válido.",
    manifest: "Esta ciudad aún no tiene paquete offline.",
    manifestInvalid: "El manifiesto offline no es válido.",
    bounds: "La ciudad no tiene límites disponibles para descargar el mapa.",
  },
  share: {
    routeTitle: (name: string) => `Ruta hacia ${name}`,
    dialogTitle: "Compartir",
  },
};
