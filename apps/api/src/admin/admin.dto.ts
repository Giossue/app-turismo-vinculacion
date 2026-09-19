import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Matches,
  IsString,
  Max,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export const REVIEWABLE_STATUSES = [
  "BORRADOR",
  "EN_REVISION",
  "APROBADO",
  "RECHAZADO",
  "PUBLICADO",
  "INACTIVO",
] as const;

export class AdminCentersQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(2)
  q?: string;

  @IsOptional()
  @IsIn(REVIEWABLE_STATUSES)
  status?: (typeof REVIEWABLE_STATUSES)[number];

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

export class ReviewCenterDto {
  @IsIn(["APPROVE", "REJECT"])
  action!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  observation?: string;
}

export class AdminAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  barrio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  crossStreet?: string;
}

export class AdminAdministrationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  institution?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  position?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @IsString()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class AdminClimateDto {
  @IsInt()
  @IsPositive()
  climateId!: number;

  @IsOptional()
  @IsNumber()
  minTemperature?: number;

  @IsOptional()
  @IsNumber()
  maxTemperature?: number;

  @IsOptional()
  @IsNumber()
  minRainfall?: number;

  @IsOptional()
  @IsNumber()
  maxRainfall?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class AdminAdmissionDto {
  @IsInt()
  @IsPositive()
  incomeTypeId!: number;

  @IsInt()
  @IsPositive()
  attentionModeId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  opensAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  closesAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  otherAttention?: string;

  @IsOptional()
  @IsBoolean()
  reservations = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceFrom?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceTo?: number;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class AdminActivityDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  activityId!: number;

  @IsBoolean()
  active = true;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  detailOther?: string;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class AdminAccessibilityDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  typeId!: number;

  @IsBoolean()
  applies = false;

  @IsOptional()
  @IsString()
  observation?: string;
}

export class AdminFacilityDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  typeId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  detailOther?: string;

  @IsOptional()
  @IsString()
  observation?: string;
}

/**
 * Campos del núcleo de una ficha. Todos son opcionales en el transporte para
 * permitir PATCH; el servicio exige el conjunto mínimo al crear o enviar a
 * revisión.
 */
export class SaveAdminCenterDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  subtypeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  touristZoneId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  parishId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productLineId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  scenarioId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  hierarchyId?: number;

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
  altitudeMeters?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAddressDto)
  address?: AdminAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAdministrationDto)
  administration?: AdminAdministrationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminClimateDto)
  climate?: AdminClimateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdminAdmissionDto)
  admission?: AdminAdmissionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminActivityDto)
  activities?: AdminActivityDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminAccessibilityDto)
  accessibility?: AdminAccessibilityDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminFacilityDto)
  facilities?: AdminFacilityDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;
}

export class AdminCatalogsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  includeInactive?: boolean;
}

export class AdminCatalogUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
