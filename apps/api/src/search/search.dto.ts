import { Transform } from "class-transformer";
import {
  IsNumber,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

// An empty query parameter is not the coordinate zero.
const numeric = ({ value }: { value: unknown }) =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN;

@ValidatorConstraint({ name: "searchCoordinates", async: false })
class SearchCoordinatesConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, { object }: ValidationArguments): boolean {
    const query = object as PublicSearchQueryDto;
    return (query.latitude === undefined) === (query.longitude === undefined);
  }

  defaultMessage(): string {
    return "latitude and longitude must be supplied together";
  }
}

@ValidatorConstraint({ name: "searchBounds", async: false })
class SearchBoundsConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, { object }: ValidationArguments): boolean {
    const { west, south, east, north } = object as PublicSearchQueryDto;
    const values = [west, south, east, north];
    if (values.every((value) => value === undefined)) return true;
    return (
      values.every(
        (value) => typeof value === "number" && Number.isFinite(value),
      ) &&
      west! < east! &&
      south! < north!
    );
  }

  defaultMessage(): string {
    return "west, south, east and north must form a complete, ordered bounding box";
  }
}

export class PublicSearchQueryDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Validate(SearchCoordinatesConstraint)
  @Validate(SearchBoundsConstraint)
  q!: string;

  @IsOptional()
  @IsIn(["center", "establishment", "geographic"])
  kind?: "center" | "establishment" | "geographic";

  @IsOptional()
  @Transform(numeric)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Transform(numeric)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Transform(numeric)
  @IsNumber()
  @Min(-180)
  @Max(180)
  west?: number;

  @IsOptional()
  @Transform(numeric)
  @IsNumber()
  @Min(-90)
  @Max(90)
  south?: number;

  @IsOptional()
  @Transform(numeric)
  @IsNumber()
  @Min(-180)
  @Max(180)
  east?: number;

  @IsOptional()
  @Transform(numeric)
  @IsNumber()
  @Min(-90)
  @Max(90)
  north?: number;
}
