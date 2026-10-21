/** Mapa base y selección de lugares en el mapa. */
export const mapEs = {
  label: "Mapa con atractivos turísticos publicados",
  webLabel: "Mapa disponible en la aplicación móvil",
  webTitle: "Mapa móvil",
  webBody: (count: number) =>
    `El mapa interactivo MapLibre se muestra en el Development Build móvil. Hay ${count} atractivo(s) publicados.`,
  attribution: "Ver atribución del mapa",
  north: "Orientar mapa al norte",
  several: "Varios lugares aquí",
  chooseOne: "Selecciona cuál quieres abrir.",
  openCenter: "Abre la ficha del centro turístico",
  openPoint: "Abre la ficha del punto de interés",
  centerSubtitle: (category: string) => `Centro turístico · ${category}`,
  pointSubtitle: (category: string | null) =>
    `Punto de interés · ${category ?? "Establecimiento turístico"}`,
  errors: {
    basemap: "No pudimos preparar el mapa base.",
    basemapInvalid: "El mapa base no tiene el formato esperado.",
  },
};
