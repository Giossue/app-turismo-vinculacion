import { Inject, Injectable } from "@nestjs/common";

import { EstablishmentsService } from "../../establishments/establishments.service";
import {
  type PublicEstablishmentSearch,
  type PublicEstablishmentSearchQuery,
  type PublicEstablishmentSearchResult,
} from "../application/public-establishment-search";

@Injectable()
export class EstablishmentsPublicSearchAdapter implements PublicEstablishmentSearch {
  constructor(
    @Inject(EstablishmentsService)
    private readonly establishments: EstablishmentsService,
  ) {}

  nearby(
    query: PublicEstablishmentSearchQuery,
  ): Promise<PublicEstablishmentSearchResult> {
    return this.establishments.nearby(query);
  }
}
