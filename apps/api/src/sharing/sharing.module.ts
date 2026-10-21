import { Module } from "@nestjs/common";

import { CentersModule } from "../centers/centers.module";
import {
  CenterSharePageController,
  RouteSharePageController,
} from "./share-pages.controller";
import { AssetLinksController } from "./asset-links.controller";

@Module({
  imports: [CentersModule],
  controllers: [
    AssetLinksController,
    CenterSharePageController,
    RouteSharePageController,
  ],
})
export class SharingModule {}
