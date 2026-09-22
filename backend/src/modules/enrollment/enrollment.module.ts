import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentPolicy } from './entities/enrollment-policy.entity';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentPolicy])],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}