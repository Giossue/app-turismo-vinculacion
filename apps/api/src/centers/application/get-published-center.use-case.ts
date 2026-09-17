import type { PublicCenterDetail } from "../domain/public-center";
import type { PublicCenterRepository } from "./public-center.repository";

export class GetPublishedCenterUseCase {
  constructor(private readonly centers: PublicCenterRepository) {}

  execute(code: string): Promise<PublicCenterDetail | null> {
    return this.centers.findPublishedByCode(code);
  }
}
