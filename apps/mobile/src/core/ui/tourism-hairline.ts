import { StyleSheet } from "react-native";

/**
 * Grosor mínimo visible (una línea física) para bordes y divisores sutiles.
 * Vive aparte de `tokens.ts` para que los tokens sigan sin depender de React
 * Native (los usan pruebas y estilos del mapa fuera de la app).
 */
export const turismoHairline = StyleSheet.hairlineWidth;
