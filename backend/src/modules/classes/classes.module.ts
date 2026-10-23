import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentProfile } from '../users/entities/student-profile.entity';
import { User } from '../users/entities/user.entity';
import { ClassRoom } from './entities/class-room.entity';
import { ClassMember } from './entities/class-member.entity';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassRoom, ClassMember, StudentProfile, User])],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService, TypeOrmModule],
})
export class ClassesModule {}
