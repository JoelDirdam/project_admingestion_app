import { Module } from '@nestjs/common';
import { ProductionBatchesService } from './production-batches.service';
import { ProductionBatchesController } from './production-batches.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductionBatchesController],
  providers: [ProductionBatchesService],
  exports: [ProductionBatchesService],
})
export class ProductionBatchesModule {}



