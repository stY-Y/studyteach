import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './entities/question.entity';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Question])],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService, TypeOrmModule],
})
export class QuestionsModule {}