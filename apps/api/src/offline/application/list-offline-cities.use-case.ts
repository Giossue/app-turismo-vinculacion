import type { OfflineCityRepository } from "./offline-city.repository";

export class ListOfflineCitiesUseCase {
  constructor(private readonly repository: OfflineCityRepository) {}

  execute() {
    return this.repository.listCities();
  }
}
