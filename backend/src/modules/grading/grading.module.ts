import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GradingRecord } from './entities/grading-record.entity';
import { GradingService } from './grading.service';
import { GradingController } from './grading.controller';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [TypeOrmModule.forFeature([GradingRecord]), QuestionsModule],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}