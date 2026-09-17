import type { PublicCenterPage } from "../domain/public-center";
import type {
  ListPublishedCentersQuery,
  PublicCenterRepository,
} from "./public-center.repository";

export class ListPublishedCentersUseCase {
  constructor(private readonly centers: PublicCenterRepository) {}

  execute(query: ListPublishedCentersQuery): Promise<PublicCenterPage> {
    return this.centers.listPublished(query);
  }
}
