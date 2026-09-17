import type { DiscoveryCatalog } from "../domain/public-center";
import type { PublicCenterRepository } from "./public-center.repository";

export class GetDiscoveryCatalogUseCase {
  constructor(private readonly centers: PublicCenterRepository) {}

  execute(): Promise<DiscoveryCatalog> {
    return this.centers.getDiscoveryCatalog();
  }
}
