/** Textos de los componentes compartidos, formato y ubicación. */
export const coreEs = {
  back: "Volver",
  close: "Cerrar",
  closeMenu: "Cerrar menú",
  retry: "Reintentar",
  done: "Listo",
  clearSearch: "Limpiar búsqueda",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  selectDate: "Selecciona una fecha",
  chooseDate: (label: string) => `Elegir ${label.toLowerCase()}`,
  closeDatePicker: "Cerrar selector de fecha",
  requestCancelled: "La solicitud fue cancelada.",
  errorFallback: {
    title: "Algo salió mal",
    body: "La aplicación encontró un error inesperado. Vuelve a intentarlo.",
  },
  photo: {
    defaultLabel: "Fotografía del lugar",
    position: (position: number, total: number) =>
      `Fotografía ${position} de ${total}`,
    close: "Cerrar fotografía",
    author: (author: string) => `Foto: ${author}`,
    showAuthor: "Ver autor de la foto",
    hideAuthor: "Ocultar autor de la foto",
  },
  location: {
    permissionBlocked: "Activa el permiso de ubicación desde Ajustes.",
    permissionDenied: "Necesitamos permiso para mostrar tu posición.",
    servicesDisabled: "Activa el GPS para encontrar tu posición.",
    refining: "Ajustando tu ubicación con el GPS…",
    searching: "Buscando una ubicación GPS precisa…",
    updateFailed:
      "No pudimos actualizar tu ubicación. Revisa la señal GPS e inténtalo de nuevo.",
    trackingFailed:
      "No pudimos iniciar el seguimiento de ubicación. Inténtalo de nuevo.",
    readFailed:
      "No pudimos obtener tu ubicación. Revisa la señal GPS e inténtalo de nuevo.",
  },
  relative: {
    now: "Ahora",
    today: "Hoy",
    days: (n: number) => `Hace ${n} ${n === 1 ? "día" : "días"}`,
    weeks: (n: number) => `Hace ${n} ${n === 1 ? "semana" : "semanas"}`,
    months: (n: number) => `Hace ${n} ${n === 1 ? "mes" : "meses"}`,
    years: (n: number) => `Hace ${n} ${n === 1 ? "año" : "años"}`,
  },
};
