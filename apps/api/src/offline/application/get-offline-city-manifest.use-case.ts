import type { OfflineCityRepository } from "./offline-city.repository";

export class GetOfflineCityManifestUseCase {
  constructor(private readonly repository: OfflineCityRepository) {}

  execute(slug: string) {
    return this.repository.getManifest(slug);
  }
}
