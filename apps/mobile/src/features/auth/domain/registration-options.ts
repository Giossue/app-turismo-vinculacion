/**
 * The registration choices mirror the labels used by Ecuador's civil
 * identity framework. Keep the client list closed together with the API.
 */
export const touristGenderOptions = ["Masculino", "Femenino"] as const;

export type TouristGender = (typeof touristGenderOptions)[number];

export type TouristRegistrationInput = Readonly<{
  name: string;
  email: string;
  gender: TouristGender;
  /** Local calendar date as `YYYY-MM-DD`. */
  birthDate?: string;
  password: string;
}>;
