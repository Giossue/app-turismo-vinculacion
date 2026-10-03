import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export const OPINION_REVIEW_ACTIONS = ["APPROVE", "REJECT"] as const;
export type OpinionReviewAction = (typeof OPINION_REVIEW_ACTIONS)[number];

export class OpinionContentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class OpinionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  offset = 0;
}

export const ADMIN_OPINION_STATUS_FILTERS = ["PENDIENTE", "APROBADA"] as const;
export const ADMIN_OPINION_TARGET_FILTERS = [
  "CENTRO",
  "PUNTO_INTERES",
] as const;

export type AdminOpinionFilters = {
  q?: string;
  status?: (typeof ADMIN_OPINION_STATUS_FILTERS)[number];
  targetType?: (typeof ADMIN_OPINION_TARGET_FILTERS)[number];
  rating?: number;
};

export class AdminOpinionsQueryDto extends OpinionsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(ADMIN_OPINION_STATUS_FILTERS)
  status?: AdminOpinionFilters["status"];

  @IsOptional()
  @IsIn(ADMIN_OPINION_TARGET_FILTERS)
  targetType?: AdminOpinionFilters["targetType"];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
}

export class ReviewOpinionDto {
  @IsIn(OPINION_REVIEW_ACTIONS)
  action!: OpinionReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
