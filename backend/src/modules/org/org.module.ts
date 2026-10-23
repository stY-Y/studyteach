import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassMember } from '../classes/entities/class-member.entity';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { School } from '../schools/entities/school.entity';
import { User } from '../users/entities/user.entity';
import { Grade } from './entities/grade.entity';
import { Notice } from './entities/notice.entity';
import { StaffAppointment } from './entities/staff-appointment.entity';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      School,
      Grade,
      ClassRoom,
      ClassMember,
      User,
      Notice,
      StaffAppointment,
    ]),
  ],
  controllers: [OrgController],
  providers: [OrgService, StaffService],
  exports: [OrgService, StaffService, TypeOrmModule],
})
export class OrgModule {}
