import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyReport } from './entities/study-report.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DiagnosisModule } from '../diagnosis/diagnosis.module';
import { GradingModule } from '../grading/grading.module';

@Module({
  imports: [TypeOrmModule.forFeature([StudyReport]), DiagnosisModule, GradingModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}