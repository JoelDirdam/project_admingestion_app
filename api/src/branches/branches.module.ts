import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { SellersService } from './sellers/sellers.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BranchesController],
  providers: [BranchesService, SellersService],
  exports: [BranchesService, SellersService],
})
export class BranchesModule {}

