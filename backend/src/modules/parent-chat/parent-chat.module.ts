import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { ClassMember } from '../classes/entities/class-member.entity';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { ParentStudentLink } from '../users/entities/parent-student-link.entity';
import { StudentProfile } from '../users/entities/student-profile.entity';
import { User } from '../users/entities/user.entity';
import { ParentTeacherMessage } from './entities/parent-teacher-message.entity';
import { ParentChatService } from './parent-chat.service';
import { ParentChatController } from './parent-chat.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParentTeacherMessage,
      ParentStudentLink,
      StudentProfile,
      User,
      ClassRoom,
      ClassMember,
    ]),
    ClassesModule,
  ],
  controllers: [ParentChatController],
  providers: [ParentChatService],
  exports: [ParentChatService],
})
export class ParentChatModule {}
