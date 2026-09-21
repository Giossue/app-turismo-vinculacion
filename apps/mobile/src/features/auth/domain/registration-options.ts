/**
 * The registration choices mirror the labels used by Ecuador's civil
 * identity framework. Keep the client list closed together with the API.
 */
export const touristGenderOptions = ["Masculino", "Femenino"] as const;

export type TouristGender = (typeof touristGenderOptions)[number];
