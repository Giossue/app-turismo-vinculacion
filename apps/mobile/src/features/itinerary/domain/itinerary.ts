export type DemoItineraryStop = Readonly<{
  code: string;
  duration: string;
  name: string;
  time: string;
  category: string;
}>;

export type DemoItinerary = Readonly<{
  dateLabel: string;
  title: string;
  stops: readonly DemoItineraryStop[];
}>;

export const demoItinerary: DemoItinerary = {
  dateLabel: "Sábado · 12 de octubre",
  title: "Guaranda en un día",
  stops: [
    {
      category: "Cultura",
      code: "GUA-CUL-001",
      duration: "45 min",
      name: "Centro histórico de Guaranda",
      time: "09:00",
    },
    {
      category: "Naturaleza",
      code: "GUA-NAT-001",
      duration: "1 h 20 min",
      name: "Mirador El Calvario",
      time: "11:00",
    },
    {
      category: "Gastronomía",
      code: "GUA-GAS-001",
      duration: "1 h",
      name: "Sabores de la plaza",
      time: "13:30",
    },
  ],
};
