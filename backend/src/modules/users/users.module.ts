import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { StudentProfile } from './entities/student-profile.entity';
import { TeacherProfile } from './entities/teacher-profile.entity';
import { ParentStudentLink } from './entities/parent-student-link.entity';
import { StaffAppointment } from '../org/entities/staff-appointment.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CryptoService } from '../../common/security/crypto.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      StudentProfile,
      TeacherProfile,
      ParentStudentLink,
      StaffAppointment,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, CryptoService],
  exports: [UsersService, CryptoService],
})
export class UsersModule {}