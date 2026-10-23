import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassMember } from '../classes/entities/class-member.entity';
import { ClassRoom } from '../classes/entities/class-room.entity';
import { School } from '../schools/entities/school.entity';
import { User } from '../users/entities/user.entity';
import { Grade } from './entities/grade.entity';
import { Notice } from './entities/notice.entity';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, Grade, ClassRoom, ClassMember, User, Notice]),
  ],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}
