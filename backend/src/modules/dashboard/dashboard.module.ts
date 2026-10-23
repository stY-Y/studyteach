import { Module } from '@nestjs/common';
import { OrgModule } from '../org/org.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [OrgModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
