import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesModule } from '../classes/classes.module';
import { QuestionsModule } from '../questions/questions.module';
import { Homework } from './entities/homework.entity';
import { HomeworkSubmission } from './entities/homework-submission.entity';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Homework, HomeworkSubmission]),
    ClassesModule,
    QuestionsModule,
  ],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
