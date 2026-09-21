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

export class ReviewOpinionDto {
  @IsIn(OPINION_REVIEW_ACTIONS)
  action!: OpinionReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
