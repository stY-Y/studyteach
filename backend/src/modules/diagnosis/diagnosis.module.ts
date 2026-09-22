import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosisRecord } from './entities/diagnosis-record.entity';
import { DiagnosisService } from './diagnosis.service';
import { DiagnosisController } from './diagnosis.controller';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [TypeOrmModule.forFeature([DiagnosisRecord]), QuestionsModule],
  controllers: [DiagnosisController],
  providers: [DiagnosisService],
  exports: [DiagnosisService],
})
export class DiagnosisModule {}