/** Rutas, navegación activa y recorrido con paradas. */
export const routingEs = {
  session: {
    arrived: "Has llegado a tu destino.",
    backgroundNotificationDenied:
      "Sin permiso de notificaciones la navegación seguirá solo mientras la app esté abierta.",
    backgroundPermissionDenied:
      "Sin permiso de ubicación «Siempre» la navegación seguirá solo mientras la app esté abierta.",
    backgroundUnavailable:
      "La navegación seguirá solo mientras la app esté abierta: no pudimos activar el seguimiento al cambiar de aplicación.",
    offRoute: "Te alejaste de la ruta; buscando un nuevo trayecto.",
    offRouteWithoutReroute:
      "Te alejaste del trazado. Vuelve a la ruta para continuar; no se recalcula automáticamente.",
    permissionMissing: "Necesitamos permiso de ubicación para navegar.",
    refining: "Ajustando tu ubicación con el GPS…",
    resuming: "Actualizando tu ubicación…",
    servicesDisabled: "Activa el GPS para iniciar la navegación.",
    startFailed: "No pudimos iniciar el seguimiento de ubicación.",
    trackingLost:
      "No pudimos seguir tu ubicación. Revisa el GPS e inténtalo de nuevo.",
  },
  speech: {
    arrived: "Has llegado a tu destino",
    stopReached: (name: string) => `Llegaste a ${name}`,
    now: (instruction: string) => `Ahora: ${instruction}`,
    then: (instruction: string) => `Luego: ${instruction}`,
  },
  notification: {
    appName: "Wasi Travel",
    active: "Navegación activa. Abre la app para ver la ruta.",
    now: (instruction: string) => `Ahora: ${instruction}`,
    inDistance: (distance: string, instruction: string) =>
      `En ${distance}: ${instruction}`,
    arrived: "Has llegado a tu destino.",
    arrivalChannel: "Llegada al destino",
    tracking: "Siguiendo tu ubicación durante la navegación activa.",
    backgroundUnavailable:
      "El seguimiento en segundo plano no está disponible.",
  },
  overlay: {
    recalculating: "Recalculando ruta…",
    following: "Siguiendo tu ubicación…",
    inDistance: (distance: string) => `En ${distance}`,
    closesIn: (seconds: number) => `La navegación se cerrará en ${seconds} s`,
    closesInLabel: (seconds: number) =>
      `La navegación se cerrará en ${seconds} segundos`,
    updateRoute: "Actualizar ruta",
    then: "Luego",
    thenLabel: (instruction: string) => `Luego: ${instruction}`,
    close: "Cerrar navegación",
    summaryLabel: (duration: string, distance: string, clock: string) =>
      `Quedan ${duration}, ${distance}, llegada ${clock}`,
    followingLocation: "Siguiendo mi ubicación",
    recenter: "Centrar y seguir mi ubicación",
    nextStop: (position: number, total: number, name: string) =>
      `Próxima parada (${position} de ${total}): ${name}`,
  },
  arrival: {
    nearby: "Cerca",
    review: "Opinar",
    viewPlace: "Ver ficha",
  },
  modes: {
    bicycle: { label: "Bicicleta", title: "En bicicleta" },
    car: { label: "Auto", title: "En automóvil" },
    foot: { label: "A pie", title: "A pie" },
  },
  preview: {
    close: "Cerrar ruta",
    collapse: "Contraer detalles de la ruta",
    expand: "Expandir detalles de la ruta",
    tripTo: (destination: string, stops: string) =>
      `Recorrido hacia ${destination} · ${stops}`,
    routeTo: (destination: string) => `Ruta hacia ${destination}`,
    stopCount: (count: number) =>
      count === 1 ? "1 parada" : `${count} paradas`,
    passesThrough: (stops: string, destination: string) =>
      `Pasa por ${stops} y termina en ${destination}.`,
    share: "Compartir ruta",
    loading: "Cargando ruta",
    backgroundTracking: "Seguir en segundo plano",
    backgroundTrackingHelp:
      "Mantiene las indicaciones al cambiar de app o apagar la pantalla. Al iniciar se pedirá el permiso de ubicación «Siempre».",
    steps: "Pasos",
    yourLocation: "Tu ubicación",
    noSteps: "No hay indicaciones detalladas para este trayecto.",
    start: "Iniciar navegación",
    startShort: "Navegar",
    locating: "Obteniendo ubicación…",
    locatingShort: "Ubicando…",
    retryRoute: "Reintentar ruta",
    retryShort: "Reintentar",
    calculate: "Calcular ruta",
    calculateShort: "Calcular",
    mapLabel: "Mapa de la ruta calculada",
    mapUnavailableWeb:
      "El mapa de la ruta está disponible en la app para Android e iOS.",
  },
  screen: {
    title: "Cómo llegar",
    savedTitle: "Ruta guardada",
    signIn: "Iniciar sesión",
    savedSignIn:
      "Inicia sesión con la cuenta que guardó esta ruta en el dispositivo.",
    savedOpening: "Abriendo el recorrido guardado en este dispositivo…",
    savedMissing:
      "La ruta pudo haberse eliminado o estar guardada en otra cuenta.",
    savedOpenFailed: "No pudimos abrir esta ruta",
    offline: "Conéctate para calcular una ruta nueva.",
    missingDestinationTitle: "No encontramos el destino de esta ruta",
    missingDestination:
      "Vuelve a la ficha del lugar y elige «Cómo llegar» otra vez.",
    savedNotice:
      "Ruta guardada: el GPS sigue tu avance. Si te desvías, vuelve al trazado; esta ruta no se recalcula.",
    defaultDestination: "Destino",
    defaultStop: "Parada",
  },
  errors: {
    calculate: "No pudimos calcular la ruta.",
    invalidResponse: "La respuesta de rutas no tiene el formato esperado.",
    noRoute: "No encontramos una ruta posible entre esos puntos.",
    unavailable: "El servicio de rutas no está disponible ahora.",
    savedRead: "No pudimos leer tus rutas guardadas. Inténtalo otra vez.",
    savedInvalid: "Esta ruta no tiene datos válidos para guardarla.",
    savedSave: "No pudimos guardar la ruta en este dispositivo.",
    savedUpdate:
      "No pudimos actualizar tus rutas en este dispositivo. Revisa el espacio disponible.",
    signInToUse: "Inicia sesión para usar tus rutas.",
    signInToSave: "Inicia sesión para guardar rutas.",
  },
};
