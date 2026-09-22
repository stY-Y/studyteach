import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VolunteerPlan } from './entities/volunteer-plan.entity';
import { College } from './entities/college.entity';
import { VolunteerService } from './volunteer.service';
import { VolunteerController } from './volunteer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VolunteerPlan, College])],
  controllers: [VolunteerController],
  providers: [VolunteerService],
  exports: [VolunteerService],
})
export class VolunteerModule {}