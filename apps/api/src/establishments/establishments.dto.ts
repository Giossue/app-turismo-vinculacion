import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const toOptionalTrimmedString = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" ? value.trim() : value;
};

const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
};

export class AdminEstablishmentsQueryDto {
  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(180)
  q?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(180)
  activity?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(120)
  classification?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  localityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  provinceId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  cantonId?: number;

  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

class EstablishmentFieldsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  activityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  classificationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  localityId?: number;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(40)
  numeroRegistro?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @Matches(/^\d{13}$/)
  ruc?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nombreComercial?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  actividad?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(120)
  clasificacion?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(25)
  telefono?: string;
}

export class SaveEstablishmentDto extends EstablishmentFieldsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class CreateEstablishmentDto extends EstablishmentFieldsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class PublicEstablishmentsMapQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  west?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  south?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  east?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  north?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit = 500;
}

export class PublicEstablishmentsQueryDto {
  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(180)
  activity?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(180)
  q?: string;

  @IsOptional()
  @Transform(toOptionalTrimmedString)
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  localityId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
