import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CentersModule } from "./centers/centers.module";
import { validateEnvironment } from "./config/environment";
import { HealthModule } from "./health/health.module";
import { AiModule } from "./ai/ai.module";
import { OfflineModule } from "./offline/offline.module";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { FilesModule } from "./files/files.module";
import { RoutingModule } from "./routing/routing.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        url: config.getOrThrow<string>("DATABASE_URL"),
        synchronize: false,
        autoLoadEntities: false,
      }),
    }),
    HealthModule,
    CentersModule,
    AiModule,
    OfflineModule,
    AuthModule,
    AdminModule,
    FilesModule,
    RoutingModule,
  ],
})
export class AppModule {}
