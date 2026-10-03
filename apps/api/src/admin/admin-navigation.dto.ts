import { ApiProperty } from "@nestjs/swagger";

export class AdminNavigationSignalDto {
  @ApiProperty({
    minimum: 0,
    description: "Registros que aún requieren trabajo.",
  })
  pending!: number;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  latestChange!: string | null;
}

export class AdminNavigationSummaryDto {
  @ApiProperty({ type: AdminNavigationSignalDto })
  review!: AdminNavigationSignalDto;

  @ApiProperty({ type: AdminNavigationSignalDto })
  opinions!: AdminNavigationSignalDto;

  @ApiProperty({ type: AdminNavigationSignalDto })
  centers!: AdminNavigationSignalDto;

  @ApiProperty({ type: AdminNavigationSignalDto })
  establishments!: AdminNavigationSignalDto;

  @ApiProperty({ type: AdminNavigationSignalDto })
  catalogs!: AdminNavigationSignalDto;
}

export class AdminNavigationResponseDto {
  @ApiProperty({ type: AdminNavigationSummaryDto })
  data!: AdminNavigationSummaryDto;
}
