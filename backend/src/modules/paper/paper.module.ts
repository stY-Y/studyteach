import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paper } from './entities/paper.entity';
import { PaperService } from './paper.service';
import { PaperController } from './paper.controller';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Paper]), QuestionsModule],
  controllers: [PaperController],
  providers: [PaperService],
  exports: [PaperService],
})
export class PaperModule {}