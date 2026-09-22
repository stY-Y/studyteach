import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DiagnosisModule } from '../diagnosis/diagnosis.module';
import { GradingModule } from '../grading/grading.module';
import { SchoolHomeService } from './school-home.service';
import { SchoolHomeController } from './school-home.controller';

@Module({
  imports: [UsersModule, DiagnosisModule, GradingModule],
  controllers: [SchoolHomeController],
  providers: [SchoolHomeService],
})
export class SchoolHomeModule {}