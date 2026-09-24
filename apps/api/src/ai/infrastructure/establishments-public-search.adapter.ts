import { Inject, Injectable } from "@nestjs/common";

import { EstablishmentsService } from "../../establishments/establishments.service";
import {
  type PublicEstablishmentSearch,
  type PublicEstablishmentBrowseQuery,
  type PublicEstablishmentSearchQuery,
  type PublicEstablishmentSearchResult,
} from "../application/public-establishment-search";

@Injectable()
export class EstablishmentsPublicSearchAdapter implements PublicEstablishmentSearch {
  constructor(
    @Inject(EstablishmentsService)
    private readonly establishments: EstablishmentsService,
  ) {}

  browse(query: PublicEstablishmentBrowseQuery) {
    return this.establishments.browsePublic(query);
  }

  nearby(
    query: PublicEstablishmentSearchQuery,
  ): Promise<PublicEstablishmentSearchResult> {
    return this.establishments.nearby(query);
  }
}
