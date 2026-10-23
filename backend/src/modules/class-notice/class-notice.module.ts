import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { ClassNotice } from './entities/class-notice.entity';
import { ClassNoticeService } from './class-notice.service';
import { ClassNoticeController } from './class-notice.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClassNotice]), ClassesModule],
  controllers: [ClassNoticeController],
  providers: [ClassNoticeService],
  exports: [ClassNoticeService],
})
export class ClassNoticeModule {}
