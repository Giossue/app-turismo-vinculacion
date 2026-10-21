import { coreEs } from "./core";
import { routingEs } from "./routing";
import { placesEs } from "./places";
import { exploreEs } from "./explore";
import { communityEs } from "./community";
import { offlineEs } from "./offline";
import { accountEs } from "./account";
import { agentEs } from "./agent";
import { mapEs } from "./map";

/**
 * Diccionario de referencia. El inglés debe tener exactamente la misma forma:
 * el tipo `Messages` lo exige al compilar y `messages.test.ts` lo comprueba.
 */
export const es = {
  core: coreEs,
  routing: routingEs,
  places: placesEs,
  explore: exploreEs,
  community: communityEs,
  offline: offlineEs,
  account: accountEs,
  agent: agentEs,
  map: mapEs,
};

export type Messages = typeof es;
