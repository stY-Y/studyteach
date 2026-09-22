import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgePoint } from './entities/knowledge-point.entity';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgePoint])],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService, TypeOrmModule],
})
export class KnowledgeModule {}