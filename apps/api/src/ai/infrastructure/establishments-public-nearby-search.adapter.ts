import { Inject, Injectable } from "@nestjs/common";

import { EstablishmentsService } from "../../establishments/establishments.service";
import {
  type NearbyPublicEstablishmentsQuery,
  type PublicNearbyEstablishmentSearch,
} from "../application/public-nearby-establishment-search";

@Injectable()
export class EstablishmentsPublicNearbySearchAdapter implements PublicNearbyEstablishmentSearch {
  constructor(
    @Inject(EstablishmentsService)
    private readonly establishments: EstablishmentsService,
  ) {}

  nearby(query: NearbyPublicEstablishmentsQuery) {
    return this.establishments.nearbyPublicPlaces(query);
  }
}
