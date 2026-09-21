import type { PublicCenter } from "@/features/centers/domain/public-center";
import type { PublicMapEstablishment } from "@/features/establishments/domain/establishment";

export type MapFeatureSelection = Readonly<
  | {
      kind: "center";
      center: PublicCenter;
    }
  | {
      kind: "establishment";
      establishment: PublicMapEstablishment;
    }
>;
