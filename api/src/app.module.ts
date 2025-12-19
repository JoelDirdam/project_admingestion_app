import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ProductionBatchesModule } from './production-batches/production-batches.module';
import { UsersModule } from './users/users.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LocationsModule } from './locations/locations.module';
import { BranchesModule } from './branches/branches.module';
import { SalesModule } from './sales/sales.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    ProductionBatchesModule,
    UsersModule,
    WarehouseModule,
    NotificationsModule,
    LocationsModule,
    BranchesModule,
    SalesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}


